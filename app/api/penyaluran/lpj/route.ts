import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse, parseQuery } from '@/lib/http';
import { z } from 'zod';

const lpjQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'submitted', 'approved', 'revisi']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parseQuery(req, lpjQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const where = ['1=1'];
    const params: unknown[] = [];

    if (parsed.data.status !== 'all') {
      params.push(parsed.data.status);
      where.push(`l.status = $${params.length}`);
    }

    const clause = where.join(' AND ');

    const res = await query(
      `SELECT l.id, l.request_id, l.judul, l.tgl_kegiatan, l.jumlah_realisasi,
              l.narasi, l.disusun_oleh, l.status, l.reviewer, l.catatan_review, l.created_at,
              r.nomor_pengajuan, r.jumlah_disetujui, r.jumlah_diajukan, r.status AS request_status,
              c.title AS campaign_title, b.nama_lengkap AS beneficiary_nama,
              (SELECT COUNT(*) FROM disbursement_proofs dp WHERE dp.disbursement_request_id = l.request_id) AS total_bukti
       FROM disbursement_lpj l
       JOIN disbursement_requests r ON r.id = l.request_id
       LEFT JOIN campaigns c ON c.id = r.campaign_id
       LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
       WHERE ${clause}
       ORDER BY l.tgl_kegiatan DESC NULLS LAST, l.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parsed.data.limit, parsed.data.offset]
    );

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM disbursement_lpj l WHERE ${clause}`,
      params
    );

    return NextResponse.json({
      rows: res.rows.map((row) => ({
        ...row,
        jumlah_realisasi: Number(row.jumlah_realisasi || 0),
        jumlah_disetujui: Number(row.jumlah_disetujui || row.jumlah_diajukan || 0),
        total_bukti: Number(row.total_bukti || 0),
      })),
      total: countRes.rows[0]?.total || 0,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

