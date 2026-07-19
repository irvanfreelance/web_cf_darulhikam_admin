import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

const affiliateSchema = z.object({
  affiliate_code: z.string().min(3),
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  status: z.string().default('ACTIVE'),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        a.*,
        COALESCE(stats.donors, 0) as converted_donors,
        COALESCE(stats.raised, 0) as raised_amount,
        COUNT(*) OVER() as total_count
      FROM affiliates a
      LEFT JOIN (
        SELECT 
          affiliate_id, 
          SUM(converted_donors) as donors, 
          SUM(raised_amount) as raised
        FROM affiliate_campaign_stats
        GROUP BY affiliate_id
      ) stats ON stats.affiliate_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      sql += ` AND (a.name ILIKE $1 OR a.affiliate_code ILIKE $1 OR a.email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    sql += `
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Affiliates Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = affiliateSchema.parse(body);
    
    // Default password_hash for now (needs real auth if implemented)
    const password_hash = '$2a$12$DummyGeneratedByAdmin'; 
    
    const sql = `
      INSERT INTO affiliates (affiliate_code, name, email, phone, status, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await query(sql, [validated.affiliate_code, validated.name, validated.email, validated.phone, validated.status, password_hash]);
    await safeFlushCache();
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const validated = affiliateSchema.partial().parse(data);
    const entries = Object.entries(validated).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    const setClause = entries.map(([k, _], i) => `${k} = $${i + 1}`).join(', ');
    const params = entries.map(([_, v]) => v);
    params.push(id);

    const sql = `UPDATE affiliates SET ${setClause} WHERE id = $${params.length} RETURNING *`;
    const res = await query(sql, params);

    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query('DELETE FROM affiliates WHERE id = $1', [id]);
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
