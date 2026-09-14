import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  icon_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  label: z.string().min(2),
  value: z.number(),
  suffix: z.string().optional().nullable().transform(v => v === '' ? null : v),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active_only');

    let sql = `SELECT * FROM web_impact_categories`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`label ILIKE $${params.length}`);
    }
    if (activeOnly === 'true') {
      conditions.push(`is_active = TRUE`);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ` ORDER BY display_order ASC, id ASC LIMIT 100`;

    const data = await query(sql, params);
    return NextResponse.json(data.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const res = await query(
      `INSERT INTO web_impact_categories (icon_url, label, value, suffix, display_order, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [data.icon_url, data.label, data.value, data.suffix, data.display_order, data.is_active]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data = schema.partial().parse(body);
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    if (fields.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    params.push(body.id);
    const res = await query(
      `UPDATE web_impact_categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query(`DELETE FROM web_impact_categories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
