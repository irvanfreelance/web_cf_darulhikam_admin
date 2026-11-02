import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';

const querySchema = z.object({});

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const [statusRes, bulanRes, pmRes, lpjRes, realisasiRes] = await Promise.all([
      query(
        `SELECT status, COUNT(*)::int AS jumlah, COALESCE(SUM(jumlah_diajukan), 0) AS nominal
         FROM disbursement_requests
         GROUP BY status
         ORDER BY status`
      ),
      query(
        `SELECT to_char(date_trunc('month', tgl_pengajuan), 'YYYY-MM') AS bulan,
                COUNT(*)::int AS diajukan,
                COUNT(*) FILTER (WHERE status = 'disbursed')::int AS disalurkan
         FROM disbursement_requests
         WHERE tgl_pengajuan >= (date_trunc('month', CURRENT_DATE) - INTERVAL '5 months')
         GROUP BY 1
         ORDER BY 1`
      ),
      query(
        `SELECT status_verifikasi AS status, COUNT(*)::int AS jumlah
         FROM beneficiaries
         WHERE deleted_at IS NULL
         GROUP BY status_verifikasi
         ORDER BY status_verifikasi`
      ),
      query(`SELECT COUNT(*)::int AS jumlah FROM disbursement_lpj`),
      query(
        `SELECT COALESCE(SUM(l.jumlah_realisasi), 0) AS nominal
         FROM disbursement_lpj l
         JOIN disbursement_requests r ON r.id = l.request_id
         WHERE r.status = 'disbursed'`
      ),
    ]);

    const byStatus = Object.fromEntries(statusRes.rows.map((row) => [row.status, row]));
    const count = (status: string) => Number(byStatus[status]?.jumlah || 0);
    const nominal = (status: string) => Number(byStatus[status]?.nominal || 0);
    const penerima = pmRes.rows.reduce((sum, row) => sum + Number(row.jumlah || 0), 0);

    return NextResponse.json({
      kpi: {
        pengajuan: statusRes.rows.reduce((sum, row) => sum + Number(row.jumlah || 0), 0),
        menunggu: count('submitted') + count('reviewed') + count('draft'),
        disetujui: count('approved'),
        disalurkan: count('disbursed'),
        nilai_diajukan: statusRes.rows.reduce((sum, row) => sum + Number(row.nominal || 0), 0),
        nilai_disetujui: nominal('approved') + nominal('disbursed'),
        nilai_realisasi: Number(realisasiRes.rows[0]?.nominal || 0),
        lpj: Number(lpjRes.rows[0]?.jumlah || 0),
        penerima,
        penerima_terverifikasi: Number(pmRes.rows.find((row) => row.status === 'verified')?.jumlah || 0),
      },
      status: statusRes.rows,
      bulanan: bulanRes.rows,
      verifikasi: pmRes.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
