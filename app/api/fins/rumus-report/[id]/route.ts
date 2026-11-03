import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const updateRumusSchema = z.object({
  nama_coa: z.string().trim().min(1, 'Nama judul baris wajib diisi'),
  coa: z.string().trim().optional().default(''),
  level: z.coerce.number().int().min(0).max(5).default(0),
  sort: z.coerce.number().int().min(1).default(1),
  active: z.enum(['y', 'n']).default('y'),
  keterangan: z.string().trim().optional().default(''),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report') || 'LPK';

  try {
    const res = await query(
      `SELECT * FROM fins_report WHERE report = $1 ORDER BY sort ASC`,
      [report]
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  try {
    const rawBody = await req.json();
    const validated = updateRumusSchema.parse(rawBody);

    const res = await query(
      `UPDATE fins_report
       SET nama_coa = $1,
           coa = $2,
           level = $3,
           sort = $4,
           active = $5,
           keterangan = $6,
           dtu = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        validated.nama_coa,
        validated.coa,
        validated.level,
        validated.sort,
        validated.active,
        validated.keterangan,
        numId,
      ]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Baris laporan tidak ditemukan' }, { status: 404 });
    }

    try {
      await invalidateCache(['fins:report:*']);
    } catch (e) {
      console.warn('Redis flush error in fins_report:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

