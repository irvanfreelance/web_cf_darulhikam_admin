import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const calkSchema = z.object({
  periodId: z.coerce.number().int().positive(),
  nomorCatatan: z.coerce.number().int().positive(),
  judul: z.string().trim().min(3).max(300),
  isi: z.string().trim().min(1),
  tipeKonten: z.enum(['text', 'table', 'number']).default('text'),
  aktif: z.boolean().default(true),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');

  try {
    let sql = `SELECT * FROM fins_calk_notes WHERE aktif = true`;
    const params: any[] = [];

    if (periodId) {
      sql += ` AND period_id = $1`;
      params.push(Number(periodId));
    }

    sql += ` ORDER BY nomor_catatan ASC`;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const validated = calkSchema.parse(rawBody);

    const res = await query(
      `INSERT INTO fins_calk_notes (
         period_id, nomor_catatan, judul, isi, tipe_konten, aktif, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (period_id, nomor_catatan)
       DO UPDATE SET
         judul = EXCLUDED.judul,
         isi = EXCLUDED.isi,
         tipe_konten = EXCLUDED.tipe_konten,
         aktif = EXCLUDED.aktif,
         updated_at = NOW()
       RETURNING *`,
      [
        validated.periodId,
        validated.nomorCatatan,
        validated.judul,
        validated.isi,
        validated.tipeKonten,
        validated.aktif,
      ]
    );

    try {
      await invalidateCache(['fins:calk:*']);
    } catch (e) {
      console.warn('Redis flush error in calk post:', e);
    }

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

