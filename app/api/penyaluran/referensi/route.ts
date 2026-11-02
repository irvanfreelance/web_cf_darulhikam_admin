import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';

const querySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
});

async function optionalRows(sql: string) {
  try {
    const res = await query(sql);
    return res.rows;
  } catch (error: any) {
    if (error?.code === '42P01' || error?.code === '42703') return [];
    throw error;
  }
}

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const [campaigns, beneficiaries, programs, coa] = await Promise.all([
      query(`SELECT id, title FROM campaigns ORDER BY title ASC LIMIT 500`),
      query(
        `SELECT id, kode_beneficiary, nama_lengkap, status_verifikasi
         FROM beneficiaries
         WHERE deleted_at IS NULL
         ORDER BY nama_lengkap ASC
         LIMIT 500`
      ),
      optionalRows(
        `SELECT id, kode, nama, campaign_id, dp_percent
         FROM fins_program
         WHERE aktif IS DISTINCT FROM false
         ORDER BY nama ASC`
      ),
      optionalRows(
        `SELECT coa, nama_coa FROM fins_coa WHERE active = 'y' ORDER BY coa ASC LIMIT 400`
      ),
    ]);

    return NextResponse.json({
      campaigns: campaigns.rows,
      beneficiaries: beneficiaries.rows,
      programs,
      coa,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
