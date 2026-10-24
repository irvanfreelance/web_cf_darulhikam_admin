import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coa         = searchParams.get('coa') || '';
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo   = searchParams.get('periodeTo') || '';
  const officeId    = searchParams.get('officeId') || 'all';

  if (!coa) {
    return NextResponse.json({ rows: [], totalDebet: 0, totalKredit: 0, saldoAkhir: 0, coaInfo: null });
  }

  // Fetch COA info (saldo type: d=debet-normal, k=kredit-normal)
  const coaRes = await query(
    `SELECT coa, nama_coa, saldo FROM fins_coa WHERE coa = $1`,
    [coa]
  );
  const coaInfo = coaRes.rows[0] || null;

  const conditions: string[] = [`j.coa = $1`];
  const params: any[] = [coa];

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

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Running balance: for debet-normal COA, saldo = Σ(debet) - Σ(kredit), for kredit-normal reversed
  const saldoExpr = coaInfo?.saldo === 'k'
    ? `SUM(j.kredit - j.debet) OVER (ORDER BY j.tgl_exre, j.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`
    : `SUM(j.debet - j.kredit) OVER (ORDER BY j.tgl_exre, j.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`;

  const [dataRes, sumRes] = await Promise.all([
    query(
      `SELECT j.id, j.id_jurnal, j.id_trans, j.id_exre, j.tgl_exre,
              j.debet, j.kredit, j.keterangan, j.nik_input, j.id_kantor,
              j.noresi, j.coa_buku, j.jenis,
              cb.nama_coa AS nama_coa_buku,
              k.nama AS nama_kantor,
              ${saldoExpr} AS saldo_berjalan
       FROM fins_jurnal j
       LEFT JOIN fins_coa cb ON cb.coa = j.coa_buku
       LEFT JOIN fins_kantor k ON k.id = j.id_kantor
       ${where}
       ORDER BY j.tgl_exre ASC, j.id ASC`,
      params
    ),
    query(
      `SELECT
         COALESCE(SUM(j.debet),0)  AS total_debet,
         COALESCE(SUM(j.kredit),0) AS total_kredit
       FROM fins_jurnal j ${where}`,
      params
    ),
  ]);

  const totalDebet  = Number(sumRes.rows[0]?.total_debet || 0);
  const totalKredit = Number(sumRes.rows[0]?.total_kredit || 0);
  const saldoAkhir  = coaInfo?.saldo === 'k' ? totalKredit - totalDebet : totalDebet - totalKredit;

  return NextResponse.json({
    rows: dataRes.rows,
    totalDebet,
    totalKredit,
    saldoAkhir,
    coaInfo,
  });
}
