import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Tren Transaksi Per Bulan (6 bulan terakhir)
    const monthlyRes = await query(`
      SELECT 
        TO_CHAR(COALESCE(paid_at, created_at), 'YYYY-MM') AS bulan,
        COUNT(*) AS transaksi_count,
        COALESCE(SUM(COALESCE(base_amount, total_amount, 0)), 0) AS total_nominal
      FROM invoices
      WHERE status = 'PAID'
        AND COALESCE(paid_at, created_at) >= NOW() - INTERVAL '6 month'
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    // 2. Transaksi Per Metode Pembayaran
    const methodRes = await query(`
      SELECT 
        COALESCE(pm.name, 'Lainnya / Manual') AS metode,
        COUNT(i.id) AS transaksi_count,
        COALESCE(SUM(COALESCE(i.base_amount, i.total_amount, 0)), 0) AS total_nominal
      FROM invoices i
      LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
      WHERE i.status = 'PAID'
      GROUP BY 1
      ORDER BY total_nominal DESC
      LIMIT 8
    `);

    // 3. Top Kampanye Berdasarkan Penghimpunan
    const campaignRes = await query(`
      SELECT 
        c.title AS campaign_title,
        COUNT(t.id) AS donasi_count,
        COALESCE(SUM(t.amount), 0) AS total_himpun
      FROM transactions t
      JOIN campaigns c ON c.id = t.campaign_id
      JOIN invoices i ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
      WHERE i.status = 'PAID'
      GROUP BY c.id, c.title
      ORDER BY total_himpun DESC
      LIMIT 10
    `);

    // 4. Sebaran Ukuran Donasi (Ticket Size)
    const sizeRes = await query(`
      SELECT
        CASE
          WHEN COALESCE(base_amount, total_amount) < 50000 THEN '< Rp50.000'
          WHEN COALESCE(base_amount, total_amount) <= 200000 THEN 'Rp50rb - Rp200rb'
          WHEN COALESCE(base_amount, total_amount) <= 1000000 THEN 'Rp200rb - Rp1jt'
          ELSE '> Rp1.000.000'
        END AS range,
        COUNT(*) AS count,
        SUM(COALESCE(base_amount, total_amount)) AS total_nominal
      FROM invoices
      WHERE status = 'PAID'
      GROUP BY 1
      ORDER BY MIN(COALESCE(base_amount, total_amount)) ASC
    `);

    return NextResponse.json({
      monthly: monthlyRes.rows.map((r) => ({
        bulan: r.bulan,
        transaksi: Number(r.transaksi_count),
        nominal: Number(r.total_nominal),
      })),
      methods: methodRes.rows.map((r) => ({
        metode: r.metode,
        transaksi: Number(r.transaksi_count),
        nominal: Number(r.total_nominal),
      })),
      campaigns: campaignRes.rows.map((r) => ({
        campaign: r.campaign_title,
        donasi_count: Number(r.donasi_count),
        nominal: Number(r.total_himpun),
      })),
      sizes: sizeRes.rows.map((r) => ({
        range: r.range,
        count: Number(r.count),
        nominal: Number(r.total_nominal),
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

