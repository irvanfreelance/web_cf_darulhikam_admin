import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo   = searchParams.get('periodeTo') || '';
  const keyword     = searchParams.get('keyword') || '';
  const officeId    = searchParams.get('officeId') || 'all';
  const jenis       = searchParams.get('jenis') || 'all';
  const approve     = searchParams.get('approve') || 'all';
  const limit       = parseInt(searchParams.get('limit') || '25', 10);
  const offset      = parseInt(searchParams.get('offset') || '0', 10);

  const conditions: string[] = [];
  const params: any[] = [];

  if (periodeFrom) {
    params.push(periodeFrom);
    conditions.push(`t.tgl_exre::date >= $${params.length}`);
  }
  if (periodeTo) {
    params.push(periodeTo);
    conditions.push(`t.tgl_exre::date <= $${params.length}`);
  }
  if (officeId !== 'all') {
    params.push(Number(officeId));
    conditions.push(`t.id_kantor = $${params.length}`);
  }
  if (jenis !== 'all') {
    params.push(jenis);
    conditions.push(`t.jenis = $${params.length}`);
  }
  if (approve !== 'all') {
    params.push(approve);
    conditions.push(`t.approve = $${params.length}`);
  }
  if (keyword) {
    params.push(`%${keyword.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(
      `(LOWER(t.id_trans) LIKE $${idx} OR LOWER(t.id_exre) LIKE $${idx} OR LOWER(t.keterangan) LIKE $${idx} OR LOWER(t.coa_debet) LIKE $${idx} OR LOWER(t.coa_kredit) LIKE $${idx})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataRes, countRes, sumRes] = await Promise.all([
    query(
      `SELECT t.id, t.id_trans, t.id_exre, t.tgl_exre, t.jenis, t.approve,
              t.coa_debet, t.coa_kredit, t.coa_ca, t.nominal, t.total,
              t.keterangan, t.nik_input, t.noresi, t.id_kantor, t.id_via_bayar,
              cd.nama_coa AS nama_coa_debet,
              ck.nama_coa AS nama_coa_kredit,
              k.nama AS nama_kantor
       FROM fins_trans t
       LEFT JOIN fins_coa cd ON cd.coa = t.coa_debet
       LEFT JOIN fins_coa ck ON ck.coa = t.coa_kredit
       LEFT JOIN fins_kantor k ON k.id = t.id_kantor
       ${where}
       ORDER BY t.tgl_exre DESC, t.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM fins_trans t ${where}`,
      params
    ),
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN t.jenis='e' THEN t.nominal ELSE 0 END),0) AS total_pengeluaran,
         COALESCE(SUM(CASE WHEN t.jenis='r' THEN t.nominal ELSE 0 END),0) AS total_penerimaan
       FROM fins_trans t ${where}`,
      params
    ),
  ]);

  return NextResponse.json({
    rows: dataRes.rows,
    total: Number(countRes.rows[0]?.total || 0),
    totalPengeluaran: Number(sumRes.rows[0]?.total_pengeluaran || 0),
    totalPenerimaan:  Number(sumRes.rows[0]?.total_penerimaan || 0),
  });
}
