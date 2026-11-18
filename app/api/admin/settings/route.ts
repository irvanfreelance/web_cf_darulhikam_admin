import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.string().trim().max(500),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user?.role || '').toLowerCase() !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
  }

  const res = await query(
    `SELECT key, value, module, description, updated_at
     FROM app_settings
     ORDER BY module ASC, key ASC`
  );
  const map: Record<string, string> = {};
  for (const r of res.rows) map[r.key] = r.value;
  return NextResponse.json({ rows: res.rows, map });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user?.role || '').toLowerCase() !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  await query(
    `UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2`,
    [parsed.data.value, parsed.data.key]
  );
  return NextResponse.json({ ok: true });
}

