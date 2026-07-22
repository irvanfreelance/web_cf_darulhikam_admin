import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const articleSchema = z.object({
  title: z.string().min(5),
  title_long: z.string().optional().nullable(),
  excerpt: z.string().min(10),
  body: z.string().min(10),
  category_id: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured_image_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  is_featured: z.boolean().default(false),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  canonical_url: z.string().optional().nullable().transform(v => v === '' ? null : v),
  robots_directive: z.enum(['index,follow','noindex,follow','index,nofollow','noindex,nofollow']).default('index,follow'),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    
    if (id) {
      const res = await query(`SELECT * FROM web_articles WHERE id = $1 LIMIT 1`, [id]);
      if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(res.rows[0]);
    }

    let sql = `
      SELECT a.*, c.name as category_name, u.name as author_name 
      FROM web_articles a
      LEFT JOIN web_article_categories c ON a.category_id = c.id
      LEFT JOIN admins u ON a.author_id = u.id
      WHERE a.deleted_at IS NULL
    `;
    const params = [];
    
    if (search) {
      sql += ` AND (a.title ILIKE $1 OR a.excerpt ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    sql += ` ORDER BY a.id DESC LIMIT 50`;
    
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const authorRes = await query('SELECT id FROM admins WHERE email = $1 LIMIT 1', [session.user.email]);
    if (authorRes.rowCount === 0) return NextResponse.json({ error: 'Author not found' }, { status: 401 });
    const author_id = authorRes.rows[0].id;

    const body = await req.json();
    const data = articleSchema.parse(body);
    
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    
    const res = await query(
      `INSERT INTO web_articles (
        slug, title, title_long, excerpt, body, category_id, status, 
        featured_image_url, is_featured, author_id,
        seo_title, seo_description, canonical_url, robots_directive
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        slug, data.title, data.title_long, data.excerpt, data.body, data.category_id, data.status,
        data.featured_image_url, data.is_featured, author_id,
        data.seo_title, data.seo_description, data.canonical_url, data.robots_directive
      ]
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
    
    const data = articleSchema.partial().parse(body);
    
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
      `UPDATE web_articles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
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
    
    // Soft delete
    await query(`UPDATE web_articles SET deleted_at = NOW(), status = 'archived' WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
