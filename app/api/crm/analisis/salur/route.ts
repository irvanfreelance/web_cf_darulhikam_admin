import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Penyaluran per Program / Kampanye
    const campaignRes = await query(`
      SELECT 
        c.title AS campaign_title,
        COUNT(r.id) AS count,
        COALESCE(SUM(COALESCE(r.jumlah_disetujui, r.jumlah_diajukan)), 0) AS total_salur
      FROM disbursement_requests r
      LEFT JOIN campaigns c ON c.id = r.campaign_id
      WHERE r.status = 'disbursed'
      GROUP BY c.id, c.title
      ORDER BY total_salur DESC
      LIMIT 10
    `);

    // 2. Penyaluran per Wilayah / Kabupaten Penerima Manfaat
    const regionRes = await query(`
      SELECT 
        COALESCE(b.kabupaten, 'Wilayah Lain / Belum Tercatat') AS wilayah,
        COUNT(r.id) AS count,
        COALESCE(SUM(COALESCE(r.jumlah_disetujui, r.jumlah_diajukan)), 0) AS total_salur
      FROM disbursement_requests r
      LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
      WHERE r.status = 'disbursed'
      GROUP BY COALESCE(b.kabupaten, 'Wilayah Lain / Belum Tercatat')
      ORDER BY total_salur DESC
      LIMIT 10
    `);

    // 3. Penyaluran per Asnaf Zakat
    const asnafRes = await query(`
      SELECT 
        COALESCE(NULLIF(TRIM(b.asnaf), ''), 'Umum / Non-Asnaf') AS asnaf,
        COUNT(r.id) AS count,
        COALESCE(SUM(COALESCE(r.jumlah_disetujui, r.jumlah_diajukan)), 0) AS total_salur
      FROM disbursement_requests r
      LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
      WHERE r.status = 'disbursed'
      GROUP BY COALESCE(NULLIF(TRIM(b.asnaf), ''), 'Umum / Non-Asnaf')
      ORDER BY total_salur DESC
    `);

    // 4. Penyaluran per Jenis (transfer, tunai, barang, jasa)
    const jenisRes = await query(`
      SELECT 
        jenis_penyaluran,
        COUNT(id) AS count,
        COALESCE(SUM(COALESCE(jumlah_disetujui, jumlah_diajukan)), 0) AS total_salur
      FROM disbursement_requests
      WHERE status = 'disbursed'
      GROUP BY jenis_penyaluran
      ORDER BY total_salur DESC
    `);

    return NextResponse.json({
      by_campaign: campaignRes.rows.map((r) => ({
        campaign: r.campaign_title || 'Program Umum',
        count: Number(r.count),
        nominal: Number(r.total_salur),
      })),
      by_region: regionRes.rows.map((r) => ({
        wilayah: r.wilayah,
        count: Number(r.count),
        nominal: Number(r.total_salur),
      })),
      by_asnaf: asnafRes.rows.map((r) => ({
        asnaf: r.asnaf,
        count: Number(r.count),
        nominal: Number(r.total_salur),
      })),
      by_jenis: jenisRes.rows.map((r) => ({
        jenis: r.jenis_penyaluran,
        count: Number(r.count),
        nominal: Number(r.total_salur),
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

