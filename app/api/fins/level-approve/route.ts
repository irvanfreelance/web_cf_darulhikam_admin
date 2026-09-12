import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  jabatan: z.string().min(1).max(150),
  expend_min: z.number().min(0).nullable().optional(),
  expend_max: z.number().min(0).nullable().optional(),
  receipt_min: z.number().min(0).nullable().optional(),
  receipt_max: z.number().min(0).nullable().optional(),
  aktif: z.boolean().default(true),
});

// Every fins_jabatan row is listed, LEFT JOINed to its fins_level_approve
// row (matched by name) — a jabatan with no matching row shows as
// "Belum diatur" until an admin saves a range for it (see
// markdown_darul_hikam/22_fins_level_approve_unique.sql).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    const res = await query(`
      SELECT j.id AS jabatan_id, j.nama AS jabatan,
             l.id, l.expend_min, l.expend_max, l.receipt_min, l.receipt_max, l.aktif
      FROM fins_jabatan j
      LEFT JOIN fins_level_approve l ON l.jabatan = j.nama
      ORDER BY j.id ASC
    `);

    let rows = res.rows.map(r => ({ ...r, is_configured: r.id !== null }));
    if (status === 'configured') rows = rows.filter(r => r.is_configured);
    if (status === 'unconfigured') rows = rows.filter(r => !r.is_configured);

    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const res = await query(
      `INSERT INTO fins_level_approve (jabatan, expend_min, expend_max, receipt_min, receipt_max, aktif)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (jabatan) DO UPDATE SET
         expend_min = EXCLUDED.expend_min,
         expend_max = EXCLUDED.expend_max,
         receipt_min = EXCLUDED.receipt_min,
         receipt_max = EXCLUDED.receipt_max,
         aktif = EXCLUDED.aktif
       RETURNING *`,
      [data.jabatan, data.expend_min ?? 0, data.expend_max ?? null, data.receipt_min ?? 0, data.receipt_max ?? null, data.aktif]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
