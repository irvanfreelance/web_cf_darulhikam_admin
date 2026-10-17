import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { safeFlushCache } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let sql = `SELECT *, COUNT(*) OVER() as total_count FROM notification_templates WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND (event_trigger ILIKE $${params.length + 1} OR channel ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_trigger, channel, subject, message_content, is_active } = body;

    const sql = `
      INSERT INTO notification_templates (event_trigger, channel, subject, message_content, is_active)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const res = await query(sql, [event_trigger, channel, subject || null, message_content, is_active ?? true]);
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, event_trigger, channel, subject, message_content, is_active } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const sql = `
      UPDATE notification_templates
      SET event_trigger = $1, channel = $2, subject = $3, message_content = $4, is_active = $5
      WHERE id = $6 RETURNING *
    `;
    const res = await query(sql, [event_trigger, channel, subject || null, message_content, is_active, id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await safeFlushCache();
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

    const res = await query('DELETE FROM notification_templates WHERE id = $1 RETURNING *', [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
