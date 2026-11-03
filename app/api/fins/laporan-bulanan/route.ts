import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1), 10);
  const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()), 10);

  const startDate = new Date(Date.UTC(tahun, bulan - 1, 1));
  const endDate = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59));

  try {
    // 1. Ringkasan Penerimaan & Pengeluaran Total Bulan ini
    const totalPenerimaanRes = await query(
      `SELECT COALESCE(SUM(nominal), 0)::numeric AS total
       FROM fins_trans
       WHERE jenis = 'M' AND approve = 'y'
         AND tgl_exre >= $1 AND tgl_exre <= $2`,
      [startDate, endDate]
    );

    const totalPengeluaranRes = await query(
      `SELECT COALESCE(SUM(nominal), 0)::numeric AS total
       FROM fins_trans
       WHERE jenis = 'P' AND approve = 'y'
         AND tgl_exre >= $1 AND tgl_exre <= $2`,
      [startDate, endDate]
    );

    // 2. Rincian Pengeluaran per Program (dari expense_requests yang approve / fins_trans)
    const perProgramRes = await query(
      `SELECT p.id, p.nama_program, p.kategori,
              COALESCE(SUM(e.total_amount), 0)::numeric AS total_realisasi
       FROM expense_requests e
       JOIN ngo_programs p ON p.id = e.program_id
       WHERE e.status = 'approved'
         AND e.approved_at >= $1 AND e.approved_at <= $2
       GROUP BY p.id, p.nama_program, p.kategori
       ORDER BY total_realisasi DESC`,
      [startDate, endDate]
    );

    // 3. Rincian Penerimaan & Pengeluaran per Kantor
    const perKantorRes = await query(
      `SELECT k.id, k.nama AS nama_kantor,
              COALESCE(SUM(CASE WHEN t.jenis = 'M' THEN t.nominal ELSE 0 END), 0)::numeric AS total_masuk,
              COALESCE(SUM(CASE WHEN t.jenis = 'P' THEN t.nominal ELSE 0 END), 0)::numeric AS total_keluar
       FROM fins_kantor k
       LEFT JOIN fins_trans t ON t.office_id = k.id AND t.approve = 'y' AND t.tgl_exre >= $1 AND t.tgl_exre <= $2
       GROUP BY k.id, k.nama
       ORDER BY k.id ASC`,
      [startDate, endDate]
    );

    // 4. Riwayat 12 Bulan Terakhir (Trend)
    const trendRes = await query(
      `SELECT 
         EXTRACT(YEAR FROM tgl_exre)::int AS tahun,
         EXTRACT(MONTH FROM tgl_exre)::int AS bulan,
         COALESCE(SUM(CASE WHEN jenis = 'M' THEN nominal ELSE 0 END), 0)::numeric AS masuk,
         COALESCE(SUM(CASE WHEN jenis = 'P' THEN nominal ELSE 0 END), 0)::numeric AS keluar
       FROM fins_trans
       WHERE approve = 'y' AND tgl_exre >= ($1::timestamptz - INTERVAL '11 months') AND tgl_exre <= $2
       GROUP BY EXTRACT(YEAR FROM tgl_exre), EXTRACT(MONTH FROM tgl_exre)
       ORDER BY tahun ASC, bulan ASC`,
      [startDate, endDate]
    );

    return NextResponse.json({
      periode: { bulan, tahun },
      totalPenerimaan: Number(totalPenerimaanRes.rows[0]?.total || 0),
      totalPengeluaran: Number(totalPengeluaranRes.rows[0]?.total || 0),
      surplusDefisit:
        Number(totalPenerimaanRes.rows[0]?.total || 0) -
        Number(totalPengeluaranRes.rows[0]?.total || 0),
      perProgram: perProgramRes.rows,
      perKantor: perKantorRes.rows,
      trend: trendRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

