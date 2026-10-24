import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo   = searchParams.get('periodeTo') || '';
  const keyword     = searchParams.get('keyword') || '';
  const officeId    = searchParams.get('officeId') || 'all';
  const coa         = searchParams.get('coa') || '';
  const jenis       = searchParams.get('jenis') || 'all';
  const limit       = parseInt(searchParams.get('limit') || '25', 10);
  const offset      = parseInt(searchParams.get('offset') || '0', 10);

  const conditions: string[] = [];
  const params: any[] = [];

  if (periodeFrom) {
    params.push(periodeFrom);
    conditions.push(`j.tgl_exre >= $${params.length}`);
  }
  if (periodeTo) {
    params.push(periodeTo);
    conditions.push(`j.tgl_exre <= $${params.length}`);
  }
  if (officeId !== 'all') {
    params.push(Number(officeId));
    conditions.push(`j.id_kantor = $${params.length}`);
  }
  if (coa) {
    params.push(`${coa}%`);
    conditions.push(`j.coa LIKE $${params.length}`);
  }
  if (jenis !== 'all') {
    params.push(jenis);
    conditions.push(`j.jenis = $${params.length}`);
  }
  if (keyword) {
    params.push(`%${keyword.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(
      `(LOWER(j.id_jurnal) LIKE $${idx} OR LOWER(j.id_exre) LIKE $${idx} OR LOWER(j.keterangan) LIKE $${idx} OR LOWER(j.coa) LIKE $${idx})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataRes, countRes, sumRes] = await Promise.all([
    query(
      `SELECT j.id, j.id_jurnal, j.id_trans, j.id_exre, j.tgl_exre, j.jenis,
              j.coa, j.debet, j.kredit, j.keterangan, j.nik_input, j.id_kantor,
              j.noresi, j.coa_buku,
              c.nama_coa,
              cb.nama_coa AS nama_coa_buku,
              k.nama AS nama_kantor
       FROM fins_jurnal j
       LEFT JOIN fins_coa c  ON c.coa  = j.coa
       LEFT JOIN fins_coa cb ON cb.coa = j.coa_buku
       LEFT JOIN fins_kantor k ON k.id = j.id_kantor
       ${where}
       ORDER BY j.tgl_exre DESC, j.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM fins_jurnal j ${where}`, params),
    query(
      `SELECT
         COALESCE(SUM(j.debet),0)  AS total_debet,
         COALESCE(SUM(j.kredit),0) AS total_kredit
       FROM fins_jurnal j ${where}`,
      params
    ),
  ]);

  return NextResponse.json({
    rows: dataRes.rows,
    total: Number(countRes.rows[0]?.total || 0),
    totalDebet:  Number(sumRes.rows[0]?.total_debet || 0),
    totalKredit: Number(sumRes.rows[0]?.total_kredit || 0),
  });
}
