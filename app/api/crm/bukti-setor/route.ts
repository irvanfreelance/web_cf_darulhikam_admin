import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';
import { likeTerm } from '@/lib/penyaluran/request-schema';

const querySchema = z.object({
  search: z.string().trim().max(150).optional().default(''),
  tahun: z.preprocess((value) => (value === '' || value == null ? undefined : value), z.coerce.number().int().min(2000).max(2100).optional()),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const where = [`i.status = 'PAID'`];
    const params: unknown[] = [];
    if (parsed.data.search) {
      params.push(likeTerm(parsed.data.search));
      where.push(`(i.invoice_code ILIKE $${params.length} ESCAPE '\\' OR i.donor_name_snapshot ILIKE $${params.length} ESCAPE '\\')`);
    }
    if (parsed.data.tahun) {
      params.push(parsed.data.tahun);
      where.push(`EXTRACT(YEAR FROM COALESCE(i.paid_at, i.created_at))::int = $${params.length}`);
    }
    const clause = where.join(' AND ');
    const [rows, count] = await Promise.all([
      query(
        `SELECT i.id, i.created_at, i.invoice_code, i.donor_id, i.donor_name_snapshot, i.donor_email,
                i.base_amount, i.total_amount, i.paid_at,
                COALESCE(MAX(c.title), '') AS campaign_title
         FROM invoices i
         LEFT JOIN transactions t ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
         LEFT JOIN campaigns c ON c.id = t.campaign_id
         WHERE ${clause}
         GROUP BY i.id, i.created_at
         ORDER BY COALESCE(i.paid_at, i.created_at) DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parsed.data.limit, parsed.data.offset]
      ),
      query(`SELECT COUNT(*)::int AS total FROM invoices i WHERE ${clause}`, params),
    ]);
    return NextResponse.json({ rows: rows.rows, total: count.rows[0]?.total ?? 0 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
