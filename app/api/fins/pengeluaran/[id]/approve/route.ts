import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

const approveExpenseSchema = z.object({
  action: z.enum(['approve', 'pay', 'reject']),
  tglBayar: z.string().optional(),
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
    const { action, tglBayar } = approveExpenseSchema.parse(rawBody);
    const userName = session.user?.name || 'Approver';

    if (action === 'reject') {
      const res = await query(
        `UPDATE expense_requests SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [numId]
      );
      return NextResponse.json({ message: 'Pengeluaran ditolak', row: res.rows[0] });
    }

    if (action === 'approve') {
      const res = await query(
        `UPDATE expense_requests
         SET status = 'approved', nik_approver = $1
         WHERE id = $2 AND status = 'draft'
         RETURNING *`,
        [userName.slice(0, 50), numId]
      );
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Pengeluaran tidak ditemukan atau bukan status draf' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Pengeluaran disetujui, siap dibayar', row: res.rows[0] });
    }

    // Action: PAY -> Ubah status paid & terbitkan jurnal jenis 'e'
    const result = await withTransaction(async (client) => {
      const check = await client.query(
        `SELECT * FROM expense_requests WHERE id = $1 FOR UPDATE`,
        [numId]
      );

      if (check.rowCount === 0) throw new Error('Pengeluaran tidak ditemukan');
      const exp = check.rows[0];

      if (exp.status === 'paid') throw new Error('Pengeluaran sudah dibayar sebelumnya');

      const payDate = tglBayar || new Date().toISOString().slice(0, 10);

      // Terbitkan transaksi & jurnal
      const { finsTransId } = await postTransaksi(client, {
        jenis: 'e',
        coaDebet: exp.coa_debet,
        coaKredit: exp.coa_kredit,
        nominal: Number(exp.total_amount),
        quantity: 1,
        tglExre: payDate,
        keterangan: `Pembayaran ${exp.judul} (${exp.nomor_expense})`,
        idExre: exp.nomor_expense,
        nikInput: userName,
        approve: 'a',
      });

      // Update expense_requests
      const updRes = await client.query(
        `UPDATE expense_requests
         SET status = 'paid',
             tgl_bayar = $1,
             fins_trans_id = $2
         WHERE id = $3
         RETURNING *`,
        [payDate, finsTransId, numId]
      );

      return updRes.rows[0];
    });

    try {
      await invalidateCache(['fins:expense:list', 'fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in expense approve:', e);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

