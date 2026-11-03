import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const programListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: z.enum(['all', 'aktif', 'nonaktif']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createProgramSchema = z.object({
  kode: z
    .string()
    .trim()
    .min(1, 'Kode program wajib diisi')
    .max(30, 'Kode maksimal 30 karakter')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh huruf, angka, minus, atau garis bawah')
    .transform((v) => v.toUpperCase()),
  nama: z.string().trim().min(3, 'Nama minimal 3 karakter').max(200, 'Nama maksimal 200 karakter'),
  dp_percent: z.coerce
    .number()
    .min(0, 'Persentase minimal 0%')
    .max(100, 'Persentase maksimal 100%')
    .default(0),
  campaign_id: z.coerce.number().int().positive().nullable().optional(),
  aktif: z.boolean().default(true),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = programListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { search, status, limit, offset } = parsed.data;

  try {
    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.kode ILIKE $${params.length} OR p.nama ILIKE $${params.length})`);
    }

    if (status === 'aktif') {
      where.push(`p.aktif IS TRUE`);
    } else if (status === 'nonaktif') {
      where.push(`p.aktif IS FALSE`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [rowsRes, countRes] = await Promise.all([
      query(
        `SELECT p.id, p.kode, p.nama, p.dp_percent, p.aktif, p.campaign_id, p.created_at,
                c.title AS campaign_title
         FROM fins_program p
         LEFT JOIN campaigns c ON c.id = p.campaign_id
         ${whereClause}
         ORDER BY p.kode ASC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      ),
      query(`SELECT COUNT(*)::int AS total FROM fins_program p ${whereClause}`, params),
    ]);

    return NextResponse.json({
      rows: rowsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
    });
  } catch (error: any) {
    console.error('API FINS Program GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = createProgramSchema.parse(body);

    // Cek kode unik
    const existing = await query('SELECT id FROM fins_program WHERE kode = $1', [validated.kode]);
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: `Kode program '${validated.kode}' sudah digunakan` },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO fins_program (kode, nama, dp_percent, campaign_id, aktif)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, kode, nama, dp_percent, campaign_id, aktif, created_at`,
      [
        validated.kode,
        validated.nama,
        validated.dp_percent,
        validated.campaign_id || null,
        validated.aktif,
      ]
    );

    try {
      await invalidateCache(['fins:program', 'fins:programs:list']);
    } catch (e) {
      console.warn('Redis flush error in fins program:', e);
    }

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

