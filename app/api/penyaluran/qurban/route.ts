import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';
import { likeTerm, qurbanListQuerySchema } from '@/lib/penyaluran/request-schema';

export async function GET(req: Request) {
  const parsed = parseQuery(req, qurbanListQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const where = ['1=1'];
    const params: unknown[] = [];
    if (parsed.data.search) {
      params.push(likeTerm(parsed.data.search));
      const i = params.length;
      where.push(
        `(s.nama_shohibul ILIKE $${i} ESCAPE '\\' OR COALESCE(s.atas_nama, '') ILIKE $${i} ESCAPE '\\' OR COALESCE(a.kode_hewan, '') ILIKE $${i} ESCAPE '\\')`
      );
    }
    const clause = where.join(' AND ');
    const [listRes, countRes] = await Promise.all([
      query(
        `SELECT s.id, s.nama_shohibul, s.atas_nama, s.kontak_shohibul, s.niat, s.urutan_peserta,
                s.invoice_id, s.created_at, a.kode_hewan, a.jenis_hewan, a.status AS status_hewan,
                c.title AS campaign_title
         FROM qurban_shahibul s
         LEFT JOIN qurban_animals a ON a.id = s.qurban_animal_id
         LEFT JOIN campaigns c ON c.id = a.campaign_id
         WHERE ${clause}
         ORDER BY s.created_at DESC, s.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parsed.data.limit, parsed.data.offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM qurban_shahibul s
         LEFT JOIN qurban_animals a ON a.id = s.qurban_animal_id
         WHERE ${clause}`,
        params
      ),
    ]);
    return NextResponse.json({ rows: listRes.rows, total: countRes.rows[0]?.total ?? 0 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
