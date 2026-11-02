import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const patchSchema = z.object({
  action: z.enum(['advance', 'update']).optional().default('update'),
  nominal: z.coerce.number().int().positive().optional(),
  cadence: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  next_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  catatan: z.string().trim().max(500).nullable().optional(),
  aktif: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    if (parsed.data.action === 'advance') {
      const res = await query(
        `UPDATE donor_routines
         SET next_due = CASE cadence
           WHEN 'weekly' THEN next_due + 7
           WHEN 'yearly' THEN (next_due + INTERVAL '1 year')::date
           ELSE (next_due + INTERVAL '1 month')::date
         END
         WHERE id = $1 AND next_due IS NOT NULL
         RETURNING *`,
        [parsedId.data.id]
      );
      if (res.rowCount === 0) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
      await invalidateCache(['api:crm:routines']);
      return NextResponse.json(res.rows[0]);
    }

    const current = await query('SELECT * FROM donor_routines WHERE id = $1', [parsedId.data.id]);
    if (current.rowCount === 0) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
    const row = current.rows[0];
    const res = await query(
      `UPDATE donor_routines
       SET nominal = $1, cadence = $2, next_due = $3, catatan = $4, aktif = $5
       WHERE id = $6
       RETURNING *`,
      [
        parsed.data.nominal ?? row.nominal,
        parsed.data.cadence ?? row.cadence,
        parsed.data.next_due ?? row.next_due,
        parsed.data.catatan === undefined ? row.catatan : parsed.data.catatan,
        parsed.data.aktif ?? row.aktif,
        parsedId.data.id,
      ]
    );
    await invalidateCache(['api:crm:routines']);
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
