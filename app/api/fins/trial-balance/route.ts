import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { getTrialBalance } from '@/lib/fins/trial-balance';
import { z } from 'zod';

const tbQuerySchema = z.object({
  periodeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  periodeTo: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  idKantor: z.string().optional().default('all'),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = tbQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { periodeFrom, periodeTo, idKantor } = parsed.data;
  const kantorId = idKantor !== 'all' ? Number(idKantor) : null;

  try {
    const data = await getTrialBalance(
      { query: (sql: string, p?: any[]) => query(sql, p) },
      { periodeFrom, periodeTo, idKantor: kantorId }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Trial Balance Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

