import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    const res = await query(`
      SELECT c.*, COUNT(a.id) as article_count 
      FROM web_article_categories c 
      LEFT JOIN web_articles a ON c.id = a.category_id 
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    
    const res = await query(
      `INSERT INTO web_article_categories (name, slug, description, is_active) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.slug, data.description, data.is_active]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const data = schema.partial().parse(body);
    
    const fields = [];
    const params = [];
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
      `UPDATE web_article_categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
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
    
    const check = await query(`SELECT id FROM web_articles WHERE category_id = $1 LIMIT 1`, [id]);
    if (check.rowCount && check.rowCount > 0) {
      return NextResponse.json({ error: 'Kategori sedang digunakan oleh artikel dan tidak dapat dihapus.' }, { status: 400 });
    }
    
    await query(`DELETE FROM web_article_categories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
