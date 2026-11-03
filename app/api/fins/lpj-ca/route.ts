import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { z } from 'zod';

const lpjListQuerySchema = z.object({
  status: z.enum(['all', 'belum', 'menunggu', 'selesai']).optional().default('all'),
  periodeFrom: z.string().optional().default(''),
  periodeTo: z.string().optional().default(''),
  officeId: z.string().optional().default('all'),
  keyword: z.string().optional().default(''),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = lpjListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { status, periodeFrom, periodeTo, officeId, keyword } = parsed.data;

  try {
    const conditions: string[] = [`p.approve IN ('a', 'aj', 'asj')`];
    const params: any[] = [];

    if (status === 'belum') {
      conditions.push(`p.approve = 'a'`);
    } else if (status === 'menunggu') {
      conditions.push(`p.approve = 'aj'`);
    } else if (status === 'selesai') {
      conditions.push(`p.approve = 'asj'`);
    }

    if (periodeFrom) {
      params.push(periodeFrom);
      conditions.push(`p.tanggal >= $${params.length}`);
    }
    if (periodeTo) {
      params.push(periodeTo);
      conditions.push(`p.tanggal <= $${params.length}`);
    }
    if (officeId !== 'all') {
      params.push(Number(officeId));
      conditions.push(`p.office_id = $${params.length}`);
    }
    if (keyword) {
      params.push(`%${keyword.toLowerCase()}%`);
      const i = params.length;
      conditions.push(`(LOWER(p.id_buku) LIKE $${i} OR LOWER(p.nama_akun) LIKE $${i} OR LOWER(p.keterangan) LIKE $${i} OR LOWER(p.user_input) LIKE $${i})`);
    }

    const sql = `
      SELECT p.id, p.id_buku, p.tanggal, p.coa_debet, p.coa_kredit, p.nama_akun, p.keterangan,
             p.quantity, p.nominal, p.realisasi, p.user_input, p.user_approve, p.approve,
             p.office_id, k.nama AS office_nama, p.sumber_dana, p.department_id,
             p.no_resi, p.via_bayar, p.bank_rek_id, p.pencair, p.tanggal_cair,
             p.tgl_lpj, p.nominal_lpj, p.bukti_lpj_url, p.user_lpj, p.pengembali, p.user_approve_lpj,
             (p.realisasi - COALESCE(p.nominal_lpj, 0)) AS selisih
      FROM fins_ca_pengajuan p
      LEFT JOIN fins_kantor k ON k.id = p.office_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.tanggal DESC, p.id DESC
    `;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API LPJ CA GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

