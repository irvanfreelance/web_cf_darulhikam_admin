import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const schema = z.object({
  icon_name: z.string().min(1).default('Heart'),
  icon_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  label: z.string().min(2),
  quote_text: z.string().optional().nullable().transform(v => v === '' ? null : v),
  quote_source: z.string().optional().nullable().transform(v => v === '' ? null : v),
  description: z.string().optional().nullable().transform(v => v === '' ? null : v),
  photo_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    let sql = `SELECT * FROM web_care_categories`;
    const params: any[] = [];
    if (search) {
      sql += ` WHERE label ILIKE $1`;
      params.push(`%${search}%`);
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
      `INSERT INTO web_care_categories (icon_name, icon_url, label, quote_text, quote_source, description, photo_url, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [data.icon_name, data.icon_url, data.label, data.quote_text, data.quote_source, data.description, data.photo_url, data.is_active, data.display_order]
    );
    await invalidateCache('web:care_categories');
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
      `UPDATE web_care_categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
    await invalidateCache('web:care_categories');
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query(`DELETE FROM web_care_categories WHERE id = $1`, [id]);
    await invalidateCache('web:care_categories');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
