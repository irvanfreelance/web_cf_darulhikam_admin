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
    let sql = `SELECT id, nama FROM fins_kantor`;
    if (parsed.data.search) {
      params.push(`%${parsed.data.search}%`);
      sql += ` WHERE nama ILIKE $1`;
    }
    sql += ` ORDER BY id ASC`;
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    if (error?.code === '42P01') return NextResponse.json([]);
    return dbErrorResponse(error);
  }
}
