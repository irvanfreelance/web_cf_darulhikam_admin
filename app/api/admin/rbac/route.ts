import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { z } from 'zod';

const assignSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  module: z.enum(['fins', 'crm', 'penyaluran']),
  role: z.enum(['admin', 'supervisor', 'akunting', 'staff', 'zisco', 'none']),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isSuperadmin =
    (session.user?.role || '').toLowerCase() === 'superadmin' ||
    ((session.user as any)?.impersonatedBy?.role || '').toLowerCase() === 'superadmin';
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });

  const res = await query(
    `SELECT u.id, u.name, u.email, u.role AS global_role,
            COALESCE(
              json_object_agg(r.module, r.role) FILTER (WHERE r.module IS NOT NULL),
              '{}'::json
            ) AS module_roles
     FROM admins u
     LEFT JOIN user_module_roles r ON r.user_id = u.id
     WHERE u.status = 'ACTIVE'
     GROUP BY u.id, u.name, u.email, u.role
     ORDER BY u.id ASC`
  );
  return NextResponse.json({ rows: res.rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isSuperadmin =
    (session.user?.role || '').toLowerCase() === 'superadmin' ||
    ((session.user as any)?.impersonatedBy?.role || '').toLowerCase() === 'superadmin';
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { user_id, module, role } = parsed.data;
  if (role === 'none') {
    await query(`DELETE FROM user_module_roles WHERE user_id = $1 AND module = $2`, [user_id, module]);
  } else {
    await query(
      `INSERT INTO user_module_roles (user_id, module, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, module) DO UPDATE SET role = EXCLUDED.role`,
      [user_id, module, role]
    );
  }
  return NextResponse.json({ ok: true });
}

