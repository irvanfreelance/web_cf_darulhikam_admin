import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Perbandingan Penghimpunan (Transactions PAID) vs Penyaluran (Disbursed requests) per Kampanye
    const res = await query(`
      WITH himpunan AS (
        SELECT 
          t.campaign_id,
          COALESCE(SUM(t.amount), 0) AS total_himpun,
          COUNT(t.id) AS donasi_count
        FROM transactions t
        JOIN invoices i ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
        WHERE i.status = 'PAID'
        GROUP BY t.campaign_id
      ),
      saluran AS (
        SELECT 
          r.campaign_id,
          COALESCE(SUM(COALESCE(r.jumlah_disetujui, r.jumlah_diajukan)), 0) AS total_salur,
          COUNT(r.id) AS salur_count
        FROM disbursement_requests r
        WHERE r.status = 'disbursed'
        GROUP BY r.campaign_id
      )
      SELECT 
        c.id AS campaign_id,
        c.title AS campaign_title,
        COALESCE(h.total_himpun, 0) AS total_himpun,
        COALESCE(h.donasi_count, 0) AS donasi_count,
        COALESCE(s.total_salur, 0) AS total_salur,
        COALESCE(s.salur_count, 0) AS salur_count,
        (COALESCE(h.total_himpun, 0) - COALESCE(s.total_salur, 0)) AS saldo_dana,
        CASE 
          WHEN COALESCE(h.total_himpun, 0) > 0 
          THEN ROUND((COALESCE(s.total_salur, 0)::numeric / h.total_himpun) * 100, 1)
          ELSE 0
        END AS rasio_salur_persen
      FROM campaigns c
      LEFT JOIN himpunan h ON h.campaign_id = c.id
      LEFT JOIN saluran s ON s.campaign_id = c.id
      WHERE COALESCE(h.total_himpun, 0) > 0 OR COALESCE(s.total_salur, 0) > 0
      ORDER BY total_himpun DESC
      LIMIT 30
    `);

    // Total Agregat Global
    const globalHimpun = res.rows.reduce((acc, r) => acc + Number(r.total_himpun), 0);
    const globalSalur = res.rows.reduce((acc, r) => acc + Number(r.total_salur), 0);
    const globalSaldo = globalHimpun - globalSalur;
    const globalRasio = globalHimpun > 0 ? Math.round((globalSalur / globalHimpun) * 100) : 0;

    return NextResponse.json({
      summary: {
        total_himpun: globalHimpun,
        total_salur: globalSalur,
        saldo_dana: globalSaldo,
        rasio_salur_persen: globalRasio,
      },
      rows: res.rows.map((r) => ({
        campaign_id: Number(r.campaign_id),
        campaign_title: r.campaign_title,
        total_himpun: Number(r.total_himpun),
        total_salur: Number(r.total_salur),
        saldo_dana: Number(r.saldo_dana),
        rasio_salur_persen: Number(r.rasio_salur_persen),
        donasi_count: Number(r.donasi_count),
        salur_count: Number(r.salur_count),
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

