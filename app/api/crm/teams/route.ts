import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';

const querySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
});

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const params: unknown[] = [];
    let sql = `SELECT id, nama, aktif FROM crm_teams`;
    if (parsed.data.search) {
      params.push(`%${parsed.data.search}%`);
      sql += ` WHERE nama ILIKE $1`;
    }
    sql += ` ORDER BY nama ASC, id ASC`;
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
