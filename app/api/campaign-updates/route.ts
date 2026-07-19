import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campaign_id = searchParams.get('campaign_id');
    const search = searchParams.get('search');
    
    let sql = `
      SELECT up.*, c.title as campaign_title 
      FROM campaign_updates up
      JOIN campaigns c ON up.campaign_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (campaign_id) {
      sql += ` AND up.campaign_id = $${paramCount}`;
      params.push(parseInt(campaign_id));
      paramCount++;
    }
    
    if (search) {
      sql += ` AND (up.title ILIKE $${paramCount} OR up.excerpt ILIKE $${paramCount} OR c.title ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ' ORDER BY up.created_at DESC';

    const items = await query(sql, params);
    return NextResponse.json(items.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campaign_id, title, excerpt, content, image_url } = body;

    const result = await query(
      `INSERT INTO campaign_updates (campaign_id, title, excerpt, content, image_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [campaign_id, title, excerpt || null, content, image_url || null]
    );

    await safeFlushCache();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('API Campaign Updates POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
