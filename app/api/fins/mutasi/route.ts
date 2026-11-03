import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

const transferSchema = z.object({
  dariRekeningId: z.coerce.number().int().positive('Pilih rekening asal'),
  keRekeningId: z.coerce.number().int().positive('Pilih rekening tujuan'),
  jumlah: z.coerce.number().positive('Jumlah mutasi harus lebih dari 0'),
  biayaTransfer: z.coerce.number().min(0).default(0),
  tglKirim: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD'),
  buktiTransferUrl: z.string().trim().optional().default(''),
});

function generateTransferNumber() {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${yymm}-${random4}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(
      `SELECT t.*,
              r1.keterangan AS dari_rekening_label, r1.coa AS dari_coa,
              r2.keterangan AS ke_rekening_label, r2.coa AS ke_coa
       FROM internal_transfers t
       LEFT JOIN fins_bank_rek r1 ON r1.id_rekening = t.dari_rekening_id
       LEFT JOIN fins_bank_rek r2 ON r2.id_rekening = t.ke_rekening_id
       ORDER BY t.created_at DESC LIMIT 100`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = transferSchema.parse(rawBody);

    if (validated.dariRekeningId === validated.keRekeningId) {
      return NextResponse.json({ error: 'Rekening asal dan tujuan tidak boleh sama' }, { status: 400 });
    }

    const nomorTransfer = generateTransferNumber();

    const result = await withTransaction(async (client) => {
      // Ambil COA dari fins_bank_rek
      const rekCheck = await client.query(
        `SELECT id_rekening, coa, keterangan FROM fins_bank_rek WHERE id_rekening IN ($1, $2)`,
        [validated.dariRekeningId, validated.keRekeningId]
      );

      const dariRek = rekCheck.rows.find((r: any) => Number(r.id_rekening) === validated.dariRekeningId);
      const keRek = rekCheck.rows.find((r: any) => Number(r.id_rekening) === validated.keRekeningId);

      if (!dariRek || !keRek) throw new Error('Data rekening bank tidak valid');

      // 1. Jurnal Transfer Utama: Debet Rekening Tujuan, Kredit Rekening Asal
      const { finsTransId } = await postTransaksi(client, {
        jenis: 'e',
        coaDebet: keRek.coa,
        coaKredit: dariRek.coa,
        nominal: validated.jumlah,
        quantity: 1,
        tglExre: validated.tglKirim,
        keterangan: `Mutasi Kas/Bank: ${dariRek.keterangan} ke ${keRek.keterangan} (${nomorTransfer})`,
        idExre: nomorTransfer,
        nikInput: userName,
        approve: 'a',
      });

      // 2. Insert ke internal_transfers
      const insRes = await client.query(
        `INSERT INTO internal_transfers (
           nomor_transfer, dari_rekening_id, ke_rekening_id, jumlah, biaya_transfer,
           tgl_kirim, tgl_diterima, bukti_transfer_url, status, fins_trans_id_keluar,
           fins_trans_id_masuk, nik_input
         )
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'completed', $8, $8, $9)
         RETURNING *`,
        [
          nomorTransfer,
          validated.dariRekeningId,
          validated.keRekeningId,
          validated.jumlah,
          validated.biayaTransfer,
          validated.tglKirim,
          validated.buktiTransferUrl || '',
          finsTransId,
          userName.slice(0, 50),
        ]
      );

      return insRes.rows[0];
    });

    try {
      await invalidateCache(['fins:mutasi:list', 'fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in mutasi:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

