import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function GET() {
  try {
    const res = await query('SELECT * FROM notification_templates ORDER BY id ASC');
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_trigger, channel, message_content, is_active } = body;
    
    const sql = `
      INSERT INTO notification_templates (event_trigger, channel, message_content, is_active) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const res = await query(sql, [event_trigger, channel, message_content, is_active ?? true]);
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, event_trigger, channel, message_content, is_active } = body;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const sql = `
      UPDATE notification_templates 
      SET event_trigger = $1, channel = $2, message_content = $3, is_active = $4
      WHERE id = $5 RETURNING *
    `;
    const res = await query(sql, [event_trigger, channel, message_content, is_active, id]);
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

    const sql = `DELETE FROM notification_templates WHERE id = $1 RETURNING *`;
    const res = await query(sql, [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
