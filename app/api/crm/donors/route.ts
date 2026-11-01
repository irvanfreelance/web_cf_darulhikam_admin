import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody, parseQuery } from '@/lib/http';
import { donorListQuerySchema, donorWriteSchema, likeTerm, type DonorWrite } from '@/lib/crm/donor-schema';

const DONOR_RETURNING = `
  id, name, email, phone, created_at, jenis, jenis_kelamin, alamat, nik,
  status_aktif, kantor_id, tim_crm_id, minat_program, verified_at, merged_into_id
`;

function filters(data: {
  search: string;
  jenis: string;
  status: string;
  gender: string;
  kantor_id?: number;
  tim_crm_id?: number;
}) {
  const where = ['d.merged_into_id IS NULL'];
  const params: unknown[] = [];
  if (data.search) {
    params.push(likeTerm(data.search));
    const i = params.length;
    where.push(
      `(d.name ILIKE $${i} ESCAPE '\\' OR d.email ILIKE $${i} ESCAPE '\\' OR d.phone ILIKE $${i} ESCAPE '\\' OR d.nik ILIKE $${i} ESCAPE '\\' OR COALESCE(d.minat_program, '') ILIKE $${i} ESCAPE '\\')`
    );
  }
  if (data.jenis !== 'all') {
    params.push(data.jenis);
    where.push(`d.jenis = $${params.length}`);
  }
  if (data.status === 'aktif') where.push(`d.status_aktif IS TRUE`);
  if (data.status === 'nonaktif') where.push(`d.status_aktif IS FALSE`);
  if (data.gender !== 'all') {
    params.push(data.gender);
    where.push(`d.jenis_kelamin = $${params.length}`);
  }
  if (data.kantor_id) {
    params.push(data.kantor_id);
    where.push(`d.kantor_id = $${params.length}`);
  }
  if (data.tim_crm_id) {
    params.push(data.tim_crm_id);
    where.push(`d.tim_crm_id = $${params.length}`);
  }
  return { where: where.join(' AND '), params };
}

async function assertRefs(data: DonorWrite) {
  if (data.tim_crm_id) {
    const team = await query('SELECT id FROM crm_teams WHERE id = $1', [data.tim_crm_id]);
    if (team.rowCount === 0) return 'Tim CRM tidak ditemukan';
  }
  if (data.kantor_id) {
    try {
      const office = await query('SELECT id FROM fins_kantor WHERE id = $1', [data.kantor_id]);
      if (office.rowCount === 0) return 'Kantor tidak ditemukan';
    } catch (error: any) {
      if (error?.code !== '42P01') throw error;
    }
  }
  if (data.nik) {
    const nik = await query('SELECT id FROM donors WHERE nik = $1', [data.nik]);
    if ((nik.rowCount ?? 0) > 0) return 'NIK sudah dipakai donatur lain';
  }
  return null;
}

export async function GET(req: Request) {
  const parsed = parseQuery(req, donorListQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { where, params } = filters(parsed.data);
    const listParams = [...params, parsed.data.limit, parsed.data.offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [listRes, countRes, statsRes] = await Promise.all([
      query(
        `SELECT d.id, d.name, d.email, d.phone, d.created_at, d.jenis, d.jenis_kelamin,
                d.alamat, d.nik, d.status_aktif, d.kantor_id, d.tim_crm_id, t.nama AS tim_crm_nama,
                d.minat_program, d.verified_at, d.merged_into_id,
                COALESCE(SUM(i.total_amount), 0) AS total_donated,
                COUNT(i.id)::int AS donation_count
         FROM donors d
         LEFT JOIN crm_teams t ON t.id = d.tim_crm_id
         LEFT JOIN invoices i ON i.donor_id = d.id AND i.status = 'PAID'
         WHERE ${where}
         GROUP BY d.id, t.nama
         ORDER BY d.created_at DESC NULLS LAST, d.id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      ),
      query(`SELECT COUNT(*)::int AS total FROM donors d WHERE ${where}`, params),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status_aktif IS TRUE)::int AS aktif,
                COUNT(*) FILTER (
                  WHERE status_aktif IS TRUE
                    AND NOT EXISTS (
                      SELECT 1 FROM invoices i
                      WHERE i.donor_id = donors.id AND i.status = 'PAID'
                    )
                )::int AS prospek
         FROM donors
         WHERE merged_into_id IS NULL`
      ),
    ]);

    return NextResponse.json({
      rows: listRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      stats: statsRes.rows[0] ?? { total: 0, aktif: 0, prospek: 0 },
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, donorWriteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const problem = await assertRefs(parsed.data);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const verifiedAt = parsed.data.terverifikasi ? new Date() : null;
    const res = await query(
      `INSERT INTO donors (
         name, email, phone, jenis, jenis_kelamin, alamat, nik, status_aktif,
         kantor_id, tim_crm_id, minat_program, verified_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING ${DONOR_RETURNING}`,
      [
        parsed.data.name,
        parsed.data.email,
        parsed.data.phone,
        parsed.data.jenis,
        parsed.data.jenis_kelamin,
        parsed.data.alamat,
        parsed.data.nik,
        parsed.data.status_aktif,
        parsed.data.kantor_id,
        parsed.data.tim_crm_id,
        parsed.data.minat_program,
        verifiedAt,
      ]
    );
    await invalidateCache(['api:crm:donors', 'api:donors', 'donors']);
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
