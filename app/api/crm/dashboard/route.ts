import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';

const querySchema = z.object({});

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const [summary, retention, teams, bulanan] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status_aktif IS TRUE)::int AS aktif,
                COUNT(*) FILTER (
                  WHERE status_aktif IS TRUE
                    AND NOT EXISTS (
                      SELECT 1 FROM invoices i
                      WHERE i.donor_id = donors.id AND i.status = 'PAID'
                    )
                )::int AS prospek,
                COUNT(*) FILTER (
                  WHERE created_at >= date_trunc('month', NOW())
                )::int AS baru
         FROM donors
         WHERE merged_into_id IS NULL`
      ),
      query(
        `WITH paid_before AS (
           SELECT DISTINCT donor_id
           FROM invoices
           WHERE status = 'PAID' AND donor_id IS NOT NULL
             AND created_at < date_trunc('month', NOW())
         ),
         paid_now AS (
           SELECT DISTINCT donor_id
           FROM invoices
           WHERE status = 'PAID' AND donor_id IS NOT NULL
             AND created_at >= date_trunc('month', NOW())
         )
         SELECT COUNT(*)::int AS basis,
                COUNT(paid_now.donor_id)::int AS bertahan
         FROM paid_before
         LEFT JOIN paid_now ON paid_now.donor_id = paid_before.donor_id`
      ),
      query(
        `SELECT COALESCE(t.nama, 'Tanpa tim') AS tim,
                COUNT(d.id)::int AS jumlah,
                COUNT(*) FILTER (WHERE d.status_aktif IS TRUE)::int AS aktif,
                COUNT(*) FILTER (
                  WHERE d.status_aktif IS TRUE
                    AND NOT EXISTS (
                      SELECT 1 FROM invoices i
                      WHERE i.donor_id = d.id AND i.status = 'PAID'
                    )
                )::int AS prospek,
                COUNT(*) FILTER (
                  WHERE EXISTS (
                    SELECT 1 FROM invoices i
                    WHERE i.donor_id = d.id AND i.status = 'PAID'
                  )
                )::int AS berdonasi
         FROM donors d
         LEFT JOIN crm_teams t ON t.id = d.tim_crm_id
         WHERE d.merged_into_id IS NULL
         GROUP BY t.id, t.nama
         ORDER BY jumlah DESC, tim ASC`
      ),
      query(
        `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS bulan,
                COUNT(*)::int AS baru
         FROM donors
         WHERE merged_into_id IS NULL
           AND created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1
         ORDER BY 1`
      ),
    ]);

    const basis = Number(retention.rows[0]?.basis || 0);
    const bertahan = Number(retention.rows[0]?.bertahan || 0);
    return NextResponse.json({
      kpi: {
        ...summary.rows[0],
        retensi_basis: basis,
        retensi_bertahan: bertahan,
        retensi_persen: basis > 0 ? Math.round((bertahan / basis) * 1000) / 10 : null,
      },
      tim: teams.rows,
      bulanan: bulanan.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
