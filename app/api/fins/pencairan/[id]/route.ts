import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { pencairanPatchSchema } from '@/lib/fins/schemas/ca';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const res = await query(
    `SELECT p.*, k.nama AS office_nama,
            r.keterangan AS bank_rek_keterangan, r.coa AS bank_rek_coa, b.bank AS bank_nama
     FROM fins_ca_pengajuan p
     LEFT JOIN fins_kantor k ON k.id = p.office_id
     LEFT JOIN fins_bank_rek r ON r.id_rekening = p.bank_rek_id
     LEFT JOIN fins_bank b ON b.id_bank = r.id_bank
     WHERE p.id = $1`,
    [id]
  );
  if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  try {
    const rawBody = await req.json();
    const validated = pencairanPatchSchema.parse(rawBody);

    const userName = session.user?.name || validated.pencair || 'System';

    if (validated.action === 'save') {
      if (validated.viaBayar === 'bank' && !validated.bankRekId) {
        return NextResponse.json({ error: 'Pilih rekening bank terlebih dahulu' }, { status: 400 });
      }

      const updatedRow = await withTransaction(async (client) => {
        // Ambil data CA dan kunci row
        const existing = await client.query(
          `SELECT * FROM fins_ca_pengajuan WHERE id = $1 FOR UPDATE`,
          [numId]
        );

        if (existing.rowCount === 0) {
          throw new Error('Data pengajuan CA tidak ditemukan');
        }

        const ca = existing.rows[0];
        if (ca.approve !== 'as') {
          const err: any = new Error('Data pengajuan sudah diproses atau belum disetujui');
          err.code = 'ALREADY_PROCESSED';
          throw err;
        }

        // Tentukan COA Kredit (bila via bank ambil dari bank_rek)
        let coaKredit = ca.coa_kredit;
        if (validated.viaBayar === 'bank' && validated.bankRekId) {
          const bankRek = await client.query(
            `SELECT coa FROM fins_bank_rek WHERE id_rekening = $1 AND active = 'y'`,
            [validated.bankRekId]
          );
          if (bankRek.rowCount && bankRek.rows[0]?.coa) {
            coaKredit = bankRek.rows[0].coa;
          }
        }

        const nominalTotal = Number(ca.nominal) * Number(ca.quantity || 1);
        const tglCair = validated.tanggal || new Date().toISOString().slice(0, 10);

        // Update fins_ca_pengajuan menjadi dicairkan ('a')
        const updRes = await client.query(
          `UPDATE fins_ca_pengajuan
           SET approve = 'a',
               no_resi = $1,
               via_bayar = $2,
               bank_rek_id = $3,
               tag = $4,
               referensi_mitra = $5,
               pencair = $6,
               tanggal_cair = $7,
               coa_kredit = $8,
               realisasi = CASE WHEN $9 THEN $10 ELSE realisasi END,
               updated_at = NOW()
           WHERE id = $11 AND approve = 'as'
           RETURNING *`,
          [
            validated.noResi || '',
            validated.viaBayar || '',
            validated.bankRekId || null,
            validated.tag || '',
            validated.referensiMitra || '',
            userName,
            tglCair,
            coaKredit,
            !!validated.cairkan,
            nominalTotal,
            numId,
          ]
        );

        if (updRes.rowCount === 0) {
          const err: any = new Error('Data sudah diproses');
          err.code = 'ALREADY_PROCESSED';
          throw err;
        }

        // Posting jurnal otomatis ke fins_trans & fins_jurnal
        await postTransaksi(client, {
          jenis: 'e', // Pengeluaran CA
          coaDebet: ca.coa_debet,
          coaKredit: coaKredit,
          nominal: ca.nominal,
          quantity: ca.quantity || 1,
          tglExre: tglCair,
          keterangan: `Pencairan CA: ${ca.keterangan || ca.nama_akun} (${ca.id_buku})`,
          idExre: ca.id_buku,
          idKantor: ca.office_id,
          idViaBayar: validated.viaBayar === 'bank' ? 1 : 2,
          mutasi: 'e',
          idProgram: 0,
          kinerja: 'Kinerja',
          nikInput: userName,
          noresi: validated.noResi || '',
          approve: 'a',
        });

        return updRes.rows[0];
      });

      try {
        await invalidateCache(['fins:ca:list', 'fins:pencairan:list', 'fins:dashboard-cash']);
      } catch (e) {
        console.warn('Redis flush error:', e);
      }

      return NextResponse.json(updatedRow);
    }

    // Action: reject
    const res = await query(
      `UPDATE fins_ca_pengajuan
       SET approve = 'r', pencair = $1, updated_at = NOW()
       WHERE id = $2 AND approve = 'as'
       RETURNING *`,
      [userName, numId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Data sudah diproses atau tidak ditemukan' }, { status: 409 });
    }

    try {
      await invalidateCache(['fins:ca:list', 'fins:pencairan:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error.code === 'ALREADY_PROCESSED') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
