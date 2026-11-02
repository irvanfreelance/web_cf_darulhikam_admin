import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody, parseQuery } from '@/lib/http';
import { todayWib } from '@/lib/wib-date';

const cadence = z.enum(['weekly', 'monthly', 'yearly']);
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const writeSchema = z.object({
  donor_id: z.coerce.number().int().positive(),
  nominal: z.coerce.number().int().positive(),
  cadence,
  mulai: dateText.optional(),
  next_due: dateText.optional(),
  catatan: z.string().trim().max(500).optional().nullable(),
  aktif: z.boolean().optional().default(true),
});
const querySchema = z.object({
  due: z.enum(['0', '1']).optional().default('0'),
  search: z.string().trim().max(100).optional().default(''),
});

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const where = ['1=1'];
    const params: unknown[] = [];
    if (parsed.data.due === '1') {
      where.push(`r.aktif IS DISTINCT FROM false AND r.next_due IS NOT NULL AND r.next_due <= CURRENT_DATE + 7`);
    }
    if (parsed.data.search) {
      params.push(`%${parsed.data.search}%`);
      where.push(`d.name ILIKE $${params.length}`);
    }
    const res = await query(
      `SELECT r.id, r.donor_id, r.nominal, r.cadence, r.aktif, r.mulai, r.next_due, r.catatan,
              d.name AS donor_name,
              CASE WHEN r.next_due < CURRENT_DATE THEN 'overdue' WHEN r.next_due <= CURRENT_DATE + 7 THEN 'due' ELSE 'later' END AS due_state
       FROM donor_routines r
       LEFT JOIN donors d ON d.id = r.donor_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.next_due ASC NULLS LAST, r.id DESC`,
      params
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await parseBody(req, writeSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const donor = await query('SELECT id FROM donors WHERE id = $1', [parsed.data.donor_id]);
    if (donor.rowCount === 0) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });
    const mulai = parsed.data.mulai || todayWib();
    const nextDue = parsed.data.next_due || mulai;
    const res = await query(
      `INSERT INTO donor_routines (donor_id, nominal, cadence, aktif, mulai, next_due, catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [parsed.data.donor_id, parsed.data.nominal, parsed.data.cadence, parsed.data.aktif, mulai, nextDue, parsed.data.catatan || null]
    );
    await invalidateCache(['api:crm:routines']);
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
