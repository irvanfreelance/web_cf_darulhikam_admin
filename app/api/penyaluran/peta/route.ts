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
    let searchSql = '';
    if (parsed.data.search) {
      params.push(`%${parsed.data.search}%`);
      searchSql = `AND (b.nama_lengkap ILIKE $1 OR b.kode_beneficiary ILIKE $1 OR COALESCE(b.kabupaten, '') ILIKE $1)`;
    }
    const res = await query(
      `SELECT b.id, b.kode_beneficiary, b.nama_lengkap, b.latitude, b.longitude, b.status_verifikasi, b.kabupaten,
              r.id AS request_id, r.nomor_pengajuan, r.status AS request_status, r.judul
       FROM beneficiaries b
       LEFT JOIN LATERAL (
         SELECT id, nomor_pengajuan, status, judul
         FROM disbursement_requests
         WHERE beneficiary_id = b.id
         ORDER BY id DESC
         LIMIT 1
       ) r ON true
       WHERE b.deleted_at IS NULL
         AND b.latitude IS NOT NULL
         AND b.longitude IS NOT NULL
         ${searchSql}
       ORDER BY b.nama_lengkap ASC
       LIMIT 500`,
      params
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
