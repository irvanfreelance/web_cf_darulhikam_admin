import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

const lpjApproveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  coaBeban: z.string().trim().optional(), // Akun beban riil
  coaKasKembali: z.string().trim().optional(), // Akun kas/bank tempat pengembalian sisa
  catatan: z.string().trim().max(500).optional().default(''),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  try {
    const rawBody = await req.json();
    const validated = lpjApproveSchema.parse(rawBody);
    const userName = session.user?.name || 'Finance';

    if (validated.action === 'reject') {
      const res = await query(
        `UPDATE fins_ca_pengajuan
         SET approve = 'a',
             updated_at = NOW()
         WHERE id = $1 AND approve = 'aj'
         RETURNING *`,
        [numId]
      );

      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Data tidak ditemukan atau bukan status menunggu approval' }, { status: 409 });
      }

      await invalidateCache(['fins:ca:list', 'fins:dashboard-cash']);
      return NextResponse.json({ message: 'LPJ ditolak dan dikembalikan ke status belum LPJ', row: res.rows[0] });
    }

    // Action: APPROVE LPJ
    const result = await withTransaction(async (client) => {
      const check = await client.query(
        `SELECT * FROM fins_ca_pengajuan WHERE id = $1 FOR UPDATE`,
        [numId]
      );

      if (check.rowCount === 0) {
        throw new Error('Data pengajuan CA tidak ditemukan');
      }

      const ca = check.rows[0];
      if (ca.approve !== 'aj') {
        const err: any = new Error('LPJ belum diajukan atau sudah diproses');
        err.code = 'ALREADY_PROCESSED';
        throw err;
      }

      const nominalRealisasi = Number(ca.nominal_lpj || 0);
      const selisih = Number(ca.realisasi) - nominalRealisasi;
      const tglLpj = ca.tgl_lpj ? new Date(ca.tgl_lpj).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

      // COA Uang Muka = coa_debet saat pencairan
      const coaUangMuka = ca.coa_debet;
      // COA Beban = pilihan atau fallback ke coa_debet
      const coaBeban = validated.coaBeban || ca.coa_debet;
      // COA Kas/Bank untuk sisa = pilihan atau fallback ke coa_kredit awal
      const coaKasKembali = validated.coaKasKembali || ca.coa_kredit;

      // 1. Jurnal Realisasi Beban: Debet Beban, Kredit Uang Muka
      if (nominalRealisasi > 0) {
        await postTransaksi(client, {
          jenis: 'e',
          coaDebet: coaBeban,
          coaKredit: coaUangMuka,
          nominal: nominalRealisasi,
          quantity: 1,
          tglExre: tglLpj,
          keterangan: `Realisasi LPJ CA: ${ca.keterangan || ca.nama_akun} (${ca.id_buku})`,
          idExre: ca.id_buku,
          idKantor: ca.office_id,
          idViaBayar: 0,
          mutasi: 'e',
          idProgram: 0,
          kinerja: 'Kinerja',
          nikInput: userName,
          noresi: ca.no_resi || '',
          approve: 'a',
        });
      }

      // 2. Jurnal Selisih (bila ada)
      if (selisih > 0) {
        // Sisa dikembalikan pemegang CA ke Kas: Debet Kas/Bank, Kredit Uang Muka
        await postTransaksi(client, {
          jenis: 'r',
          coaDebet: coaKasKembali,
          coaKredit: coaUangMuka,
          nominal: selisih,
          quantity: 1,
          tglExre: tglLpj,
          keterangan: `Pengembalian Sisa CA (${ca.id_buku}) oleh ${ca.pengembali || ca.user_lpj}`,
          idExre: ca.id_buku,
          idKantor: ca.office_id,
          idViaBayar: 0,
          mutasi: '1',
          idProgram: 0,
          kinerja: 'Kinerja',
          nikInput: userName,
          approve: 'a',
        });
      } else if (selisih < 0) {
        // Lembaga kurang bayar ke pemegang CA: Debet Uang Muka/Beban, Kredit Kas/Bank
        const kurangBayar = Math.abs(selisih);
        await postTransaksi(client, {
          jenis: 'e',
          coaDebet: coaUangMuka,
          coaKredit: coaKasKembali,
          nominal: kurangBayar,
          quantity: 1,
          tglExre: tglLpj,
          keterangan: `Penggantian Kurang Bayar CA (${ca.id_buku}) kepada ${ca.user_lpj}`,
          idExre: ca.id_buku,
          idKantor: ca.office_id,
          idViaBayar: 0,
          mutasi: '2',
          idProgram: 0,
          kinerja: 'Kinerja',
          nikInput: userName,
          approve: 'a',
        });
      }

      // 3. Update status CA menjadi ASJ (Approved Selesai Jurnal)
      const updRes = await client.query(
        `UPDATE fins_ca_pengajuan
         SET approve = 'asj',
             user_approve_lpj = $1,
             updated_at = NOW()
         WHERE id = $2 AND approve = 'aj'
         RETURNING *`,
        [userName, numId]
      );

      return updRes.rows[0];
    });

    try {
      await invalidateCache(['fins:ca:list', 'fins:pencairan:list', 'fins:dashboard-cash', 'fins:jurnal:list']);
    } catch (e) {
      console.warn('Redis flush error in lpj approve:', e);
    }

    return NextResponse.json(result);
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

