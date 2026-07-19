import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(3),
  color_theme: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        c.*,
        COUNT(camp.id) as campaign_count,
        COUNT(*) OVER() as total_count
      FROM categories c
      LEFT JOIN campaigns camp ON c.id = camp.category_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      sql += ` AND (c.name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    sql += `
      GROUP BY c.id
      ORDER BY c.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Categories Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = categorySchema.parse(body);
    
    const sql = `
      INSERT INTO categories (name, color_theme, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const res = await query(sql, [validated.name, validated.color_theme, validated.is_active]);
    try {
      await invalidateCache(['categories', 'campaigns_list']);
    } catch (re) {
      console.warn('Redis flush error:', re);
    }
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('API Categories POST Error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const validated = categorySchema.partial().parse(data);
    const entries = Object.entries(validated).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    const setClause = entries.map(([k, _], i) => `${k} = $${i + 1}`).join(', ');
    const params = entries.map(([_, v]) => v);
    params.push(id);

    const sql = `UPDATE categories SET ${setClause} WHERE id = $${params.length} RETURNING *`;
    const res = await query(sql, params);
    try {
      await invalidateCache(['categories', 'campaigns_list']);
    } catch (re) {
      console.warn('Redis flush error:', re);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('API Categories PATCH Error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Check if category has campaigns (SQL constraint RESTRICT usually prevents this but good to handle)
    const checkSql = 'SELECT id FROM campaigns WHERE category_id = $1 LIMIT 1';
    const checkRes = await query(checkSql, [id]);
    if (checkRes.rowCount && checkRes.rowCount > 0) {
      return NextResponse.json({ error: 'Cannot delete category with associated campaigns' }, { status: 400 });
    }

    await query('DELETE FROM categories WHERE id = $1', [id]);
    try {
      await invalidateCache(['categories', 'campaigns_list']);
    } catch (re) {
      console.warn('Redis flush error:', re);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Categories DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
