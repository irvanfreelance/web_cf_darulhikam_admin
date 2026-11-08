import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';
import { z } from 'zod';

const laporanQuerySchema = z.object({
  tahun: z.coerce.number().int().min(2020).max(2050).optional().default(new Date().getFullYear()),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parseQuery(req, laporanQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { tahun, bulan } = parsed.data;

  try {
    const params: unknown[] = [tahun];
    let monthFilter = '';
    if (bulan) {
      params.push(bulan);
      monthFilter = `AND EXTRACT(MONTH FROM COALESCE(r.tgl_realisasi, r.tgl_pengajuan)) = $${params.length}`;
    }

    // 1. Agregasi Penyaluran per Program + Budget FINS jika ada
    const res = await query(
      `SELECT 
        c.id AS campaign_id,
        c.title AS campaign_title,
        COUNT(r.id) AS total_kegiatan,
        COALESCE(SUM(COALESCE(r.jumlah_disetujui, r.jumlah_diajukan)), 0) AS total_realisasi,
        COALESCE(SUM(
          (SELECT COUNT(*) FROM disbursement_recipients rc WHERE rc.disbursement_request_id = r.id)
        ), COUNT(r.id)) AS total_penerima,
        COALESCE(MAX(b.budget + b.relocation + b.additional), 0) AS budget_alokasi
       FROM disbursement_requests r
       JOIN campaigns c ON c.id = r.campaign_id
       LEFT JOIN fins_budget b ON b.campaign_id = c.id
       WHERE r.status = 'disbursed'
         AND EXTRACT(YEAR FROM COALESCE(r.tgl_realisasi, r.tgl_pengajuan)) = $1
         ${monthFilter}
       GROUP BY c.id, c.title
       ORDER BY total_realisasi DESC`,
      params
    );

    // 2. Ringkasan Global
    const totalRealisasi = res.rows.reduce((acc, r) => acc + Number(r.total_realisasi), 0);
    const totalKegiatan = res.rows.reduce((acc, r) => acc + Number(r.total_kegiatan), 0);
    const totalPenerima = res.rows.reduce((acc, r) => acc + Number(r.total_penerima), 0);
    const totalBudget = res.rows.reduce((acc, r) => acc + Number(r.budget_alokasi), 0);

    return NextResponse.json({
      filter: { tahun, bulan: bulan || null },
      summary: {
        total_realisasi: totalRealisasi,
        total_kegiatan: totalKegiatan,
        total_penerima: totalPenerima,
        total_budget: totalBudget,
        persen_realisasi: totalBudget > 0 ? Math.round((totalRealisasi / totalBudget) * 100) : null,
      },
      rows: res.rows.map((r) => ({
        campaign_id: Number(r.campaign_id),
        campaign_title: r.campaign_title,
        total_kegiatan: Number(r.total_kegiatan),
        total_realisasi: Number(r.total_realisasi),
        total_penerima: Number(r.total_penerima),
        budget_alokasi: Number(r.budget_alokasi),
        persen_realisasi: Number(r.budget_alokasi) > 0 ? Math.round((Number(r.total_realisasi) / Number(r.budget_alokasi)) * 100) : null,
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

