import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { getViaJurnal } from '@/lib/fins/via-jurnal';
import { resolvePeriod } from '@/lib/fins/period';
import { z } from 'zod';

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
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
    const { action } = approveSchema.parse(rawBody);
    const userName = session.user?.name || 'Approver';

    if (action === 'reject') {
      const res = await query(
        `UPDATE fins_trans
         SET approve = 'r', nik_approve = $1, dtu = NOW()
         WHERE id = $2 AND approve = 'u'
         RETURNING *`,
        [userName.slice(0, 20), numId]
      );
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Transaksi tidak ditemukan atau sudah diproses' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Transaksi ditolak', row: res.rows[0] });
    }

    // Action: APPROVE -> terbitkan 2 baris jurnal
    const result = await withTransaction(async (client) => {
      const check = await client.query(
        `SELECT * FROM fins_trans WHERE id = $1 FOR UPDATE`,
        [numId]
      );

      if (check.rowCount === 0) {
        throw new Error('Transaksi tidak ditemukan');
      }

      const trans = check.rows[0];
      if (trans.approve !== 'u') {
        const err: any = new Error('Transaksi sudah diproses sebelumnya');
        err.code = 'ALREADY_PROCESSED';
        throw err;
      }

      const tglDate = new Date(trans.tgl_exre);
      const tglDateString = tglDate.toISOString().slice(0, 10);
      const period = await resolvePeriod(client, tglDate);

      const total = Number(trans.total || trans.nominal * trans.quantity);
      const viaJurnal = getViaJurnal(trans.mutasi);
      const ket200 = (trans.keterangan || '').slice(0, 200);

      // Update fins_trans approve = 'a'
      await client.query(
        `UPDATE fins_trans
         SET approve = 'a',
             nik_approve = $1,
             realisasi = $2,
             period_id = $3,
             dtu = NOW()
         WHERE id = $4 AND approve = 'u'`,
        [userName.slice(0, 20), total, period.id, numId]
      );

      // Terbitkan 2 baris jurnal (1 debet, 1 kredit)
      const idJurnalDebet = `${trans.id_trans}1`;
      const idJurnalKredit = `${trans.id_trans}2`;

      await client.query(
        `INSERT INTO fins_jurnal (
           id_jurnal, id_exre, coa, debet, kredit, keterangan, nik_input,
           tgl_exre, id_kantor, id_via_bayar, jenis, via_jurnal, id_trans,
           noresi, id_program, kinerja, fins_trans_id, period_id
         )
         VALUES
           ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17),
           ($18, $19, $20, 0, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)`,
        [
          // Debet (Kas/Bank)
          idJurnalDebet,
          trans.id_exre || '',
          trans.coa_debet,
          total,
          ket200,
          userName.slice(0, 20),
          tglDateString,
          trans.id_kantor,
          trans.id_via_bayar || 0,
          'r',
          viaJurnal,
          trans.id_trans,
          trans.noresi || '',
          trans.id_program || 0,
          trans.kinerja || 'Kinerja',
          trans.id,
          period.id,

          // Kredit (Pendapatan)
          idJurnalKredit,
          trans.id_exre || '',
          trans.coa_kredit,
          total,
          ket200,
          userName.slice(0, 20),
          tglDateString,
          trans.id_kantor,
          trans.id_via_bayar || 0,
          'r',
          viaJurnal,
          trans.id_trans,
          trans.noresi || '',
          trans.id_program || 0,
          trans.kinerja || 'Kinerja',
          trans.id,
          period.id,
        ]
      );

      return { id: trans.id, id_trans: trans.id_trans, approve: 'a' };
    });

    try {
      await invalidateCache(['fins:penerimaan:list', 'fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in penerimaan approve:', e);
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

