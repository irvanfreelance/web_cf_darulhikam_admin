import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Agregasi status invoice (Funnel tahapan transaksi)
    const statusRes = await query(`
      SELECT 
        status,
        COUNT(*) AS count,
        COALESCE(SUM(COALESCE(base_amount, total_amount, 0)), 0) AS total_nominal
      FROM invoices
      GROUP BY status
    `);

    // 2. Waktu konversi rata-rata (Invoice dibuat hingga PAID) dalam menit
    const speedRes = await query(`
      SELECT 
        ROUND(AVG(EXTRACT(EPOCH FROM (paid_at - created_at)) / 60)) AS avg_minutes,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (paid_at - created_at)) / 60)) AS median_minutes
      FROM invoices
      WHERE status = 'PAID' AND paid_at IS NOT NULL AND paid_at >= created_at
    `);

    // 3. Konversi per metode pembayaran
    const pmRes = await query(`
      SELECT 
        COALESCE(pm.name, 'Lainnya') AS metode,
        COUNT(*) AS total_invoices,
        COUNT(*) FILTER (WHERE i.status = 'PAID') AS paid_invoices,
        ROUND((COUNT(*) FILTER (WHERE i.status = 'PAID')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS conversion_rate
      FROM invoices i
      LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
      GROUP BY 1
      HAVING COUNT(*) >= 2
      ORDER BY total_invoices DESC
      LIMIT 8
    `);

    const summary: Record<string, { count: number; nominal: number }> = {};
    for (const r of statusRes.rows) {
      summary[r.status] = { count: Number(r.count), nominal: Number(r.total_nominal) };
    }

    const totalCreated = Object.values(summary).reduce((acc, v) => acc + v.count, 0);
    const paidCount = summary['PAID']?.count || 0;
    const pendingCount = summary['PENDING']?.count || 0;
    const expiredCount = (summary['EXPIRED']?.count || 0) + (summary['FAILED']?.count || 0) + (summary['CANCELLED']?.count || 0);

    return NextResponse.json({
      funnel: [
        { stage: 'Dibuat (Checkout)', count: totalCreated, percent: 100 },
        { stage: 'Menunggu Bayar (Pending)', count: pendingCount + paidCount, percent: totalCreated ? Math.round(((pendingCount + paidCount) / totalCreated) * 100) : 0 },
        { stage: 'Berhasil (PAID)', count: paidCount, percent: totalCreated ? Math.round((paidCount / totalCreated) * 100) : 0 },
        { stage: 'Gagal / Kedaluwarsa', count: expiredCount, percent: totalCreated ? Math.round((expiredCount / totalCreated) * 100) : 0 },
      ],
      speed: {
        avg_minutes: Number(speedRes.rows[0]?.avg_minutes || 0),
        median_minutes: Number(speedRes.rows[0]?.median_minutes || 0),
      },
      payment_methods: pmRes.rows.map((r) => ({
        metode: r.metode,
        total: Number(r.total_invoices),
        paid: Number(r.paid_invoices),
        rate: Number(r.conversion_rate || 0),
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

