import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const profileSchema = z.object({
  ngo_name: z.string().trim().min(3, 'Nama lembaga minimal 3 karakter').max(200),
  address: z.string().trim().max(1000).nullable().optional(),
  legal_info: z.string().trim().max(1000).nullable().optional(),
  npwp: z.string().trim().max(30).nullable().optional(),
  logo_url: z.string().trim().url().nullable().optional().or(z.literal('')),
  email: z.string().trim().email('Format email tidak valid').max(150).nullable().optional().or(z.literal('')),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(
      'SELECT id, ngo_name, address, legal_info, npwp, logo_url, email FROM ngo_configs ORDER BY id LIMIT 1'
    );
    return NextResponse.json(res.rows[0] || {});
  } catch (error: any) {
    console.error('API FINS Profile GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = profileSchema.parse(body);

    const check = await query('SELECT id FROM ngo_configs ORDER BY id LIMIT 1');
    let res;

    const logoUrl = validated.logo_url === '' ? null : validated.logo_url;
    const emailVal = validated.email === '' ? null : validated.email;
    const npwpVal = validated.npwp === '' ? null : validated.npwp;
    const addressVal = validated.address === '' ? null : validated.address;
    const legalInfoVal = validated.legal_info === '' ? null : validated.legal_info;

    if (check.rows.length > 0) {
      const sql = `
        UPDATE ngo_configs
        SET
          ngo_name = $1,
          address = $2,
          legal_info = $3,
          npwp = $4,
          logo_url = $5,
          email = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, ngo_name, address, legal_info, npwp, logo_url, email
      `;
      res = await query(sql, [
        validated.ngo_name,
        addressVal,
        legalInfoVal,
        npwpVal,
        logoUrl,
        emailVal,
        check.rows[0].id,
      ]);
    } else {
      const sql = `
        INSERT INTO ngo_configs (ngo_name, address, legal_info, npwp, logo_url, email)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, ngo_name, address, legal_info, npwp, logo_url, email
      `;
      res = await query(sql, [
        validated.ngo_name,
        addressVal,
        legalInfoVal,
        npwpVal,
        logoUrl,
        emailVal,
      ]);
    }

    try {
      await invalidateCache(['fins:profile', 'ngo_config', 'ngo_settings', 'ngo:configs:global_v4']);
    } catch (e) {
      console.warn('Redis flush error in fins profile:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

