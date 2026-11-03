import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const periodActionSchema = z.object({
  action: z.enum(['closing', 'closed', 'open']),
  catatan: z.string().trim().max(500).optional().default(''),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(
      `SELECT * FROM accounting_periods ORDER BY periode_tahun DESC, periode_bulan DESC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const periodId = Number(id);
  const userName = session.user?.name || 'Admin';

  try {
    const rawBody = await req.json();
    const { action, catatan } = periodActionSchema.parse(rawBody);

    const check = await query(`SELECT * FROM accounting_periods WHERE id = $1`, [periodId]);
    if (check.rowCount === 0) {
      return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 });
    }

    const currentPeriod = check.rows[0];

    // Cek pra-syarat penutupan: tidak boleh ada draf (u) pada bulan & tahun tersebut
    if (action === 'closing' || action === 'closed') {
      const draftCheck = await query(
        `SELECT COUNT(*)::int AS count_draft
         FROM fins_trans
         WHERE EXTRACT(MONTH FROM tgl_exre) = $1
           AND EXTRACT(YEAR FROM tgl_exre) = $2
           AND approve = 'u'`,
        [currentPeriod.periode_bulan, currentPeriod.periode_tahun]
      );

      const countDraft = Number(draftCheck.rows[0]?.count_draft || 0);
      if (countDraft > 0) {
        return NextResponse.json(
          { error: `Masih ada ${countDraft} transaksi berstatus draf pada periode ini. Selesaikan atau tolak terlebih dahulu.` },
          { status: 400 }
        );
      }
    }

    // Hitung total penerimaan, pengeluaran, surplus
    const summaryRes = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN jenis = 'r' THEN debet ELSE 0 END), 0)::numeric AS penerimaan,
         COALESCE(SUM(CASE WHEN jenis = 'e' THEN debet ELSE 0 END), 0)::numeric AS pengeluaran
       FROM fins_jurnal
       WHERE EXTRACT(MONTH FROM tgl_exre) = $1
         AND EXTRACT(YEAR FROM tgl_exre) = $2`,
      [currentPeriod.periode_bulan, currentPeriod.periode_tahun]
    );

    const totPenerimaan = Number(summaryRes.rows[0]?.penerimaan || 0);
    const totPengeluaran = Number(summaryRes.rows[0]?.pengeluaran || 0);
    const surplusDefisit = totPenerimaan - totPengeluaran;

    const res = await query(
      `UPDATE accounting_periods
       SET status = $1,
           total_penerimaan = $2,
           total_pengeluaran = $3,
           surplus_defisit = $4,
           nik_closing = $5,
           tgl_closed = CASE WHEN $1 = 'closed' THEN NOW() ELSE tgl_closed END,
           catatan = CASE WHEN $6 <> '' THEN $6 ELSE catatan END
       WHERE id = $7
       RETURNING *`,
      [action, totPenerimaan, totPengeluaran, surplusDefisit, userName.slice(0, 50), catatan, periodId]
    );

    try {
      await invalidateCache(['fins:periods', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in period patch:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

