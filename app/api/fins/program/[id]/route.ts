import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const updateProgramSchema = z.object({
  nama: z.string().trim().min(3, 'Nama minimal 3 karakter').max(200).optional(),
  dp_percent: z.coerce.number().min(0).max(100).optional(),
  campaign_id: z.coerce.number().int().positive().nullable().optional(),
  aktif: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const programId = Number(resolvedParams.id);
  if (!programId || isNaN(programId)) {
    return NextResponse.json({ error: 'ID program tidak valid' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = updateProgramSchema.parse(body);

    const existing = await query('SELECT * FROM fins_program WHERE id = $1', [programId]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: 'Program tidak ditemukan' }, { status: 404 });
    }

    const current = existing.rows[0];
    const nama = validated.nama !== undefined ? validated.nama : current.nama;
    const dpPercent = validated.dp_percent !== undefined ? validated.dp_percent : current.dp_percent;
    const campaignId = validated.campaign_id !== undefined ? validated.campaign_id : current.campaign_id;
    const aktif = validated.aktif !== undefined ? validated.aktif : current.aktif;

    const res = await query(
      `UPDATE fins_program
       SET nama = $1, dp_percent = $2, campaign_id = $3, aktif = $4
       WHERE id = $5
       RETURNING id, kode, nama, dp_percent, campaign_id, aktif, created_at`,
      [nama, dpPercent, campaignId, aktif, programId]
    );

    try {
      await invalidateCache(['fins:program', 'fins:programs:list']);
    } catch (e) {
      console.warn('Redis flush error in fins program:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

