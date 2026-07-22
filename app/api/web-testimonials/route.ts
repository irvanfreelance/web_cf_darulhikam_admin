import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  person_name: z.string().min(2),
  person_role: z.string().min(2),
  person_type: z.enum(['muzakki', 'mustahiq']).default('muzakki'),
  initials: z.string().max(3).optional().nullable(),
  quote: z.string().min(5),
  avatar_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  program_id: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    let sql = `SELECT * FROM web_testimonials`;
    const params: any[] = [];
    if (search) {
      sql += ` WHERE (person_name ILIKE $1 OR quote ILIKE $1 OR person_role ILIKE $1)`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY display_order ASC, id DESC LIMIT 100`;
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
    
    // Auto generate initials if not provided
    const initials = data.initials || data.person_name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
    
    const res = await query(
      `INSERT INTO web_testimonials 
       (person_name, person_role, person_type, initials, quote, avatar_url, program_id, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [data.person_name, data.person_role, data.person_type, initials, data.quote, data.avatar_url, data.program_id, data.is_active, data.display_order]
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
      `UPDATE web_testimonials SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
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
    
    await query(`DELETE FROM web_testimonials WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
