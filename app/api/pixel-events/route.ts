import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

const pixelEventSchema = z.object({
  id: z.number().optional(),
  screen_name: z.string().min(1, "Screen name is required").max(100),
  meta_event: z.string().max(100).nullable().optional(),
  tiktok_event: z.string().max(100).nullable().optional(),
  google_event: z.string().max(100).nullable().optional(),
  is_active: z.boolean().default(true)
});

export async function GET() {
  try {
    const res = await query('SELECT * FROM pixel_events ORDER BY id ASC');
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = pixelEventSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { screen_name, meta_event, tiktok_event, google_event, is_active } = parsed.data;

    const sql = `
      INSERT INTO pixel_events (screen_name, meta_event, tiktok_event, google_event, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await query(sql, [screen_name, meta_event || null, tiktok_event || null, google_event || null, is_active]);
    
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = pixelEventSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    
    const { id, screen_name, meta_event, tiktok_event, google_event, is_active } = parsed.data;
    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
    }

    const sql = `
      UPDATE pixel_events
      SET screen_name = $1, meta_event = $2, tiktok_event = $3, google_event = $4, is_active = $5
      WHERE id = $6
      RETURNING *
    `;
    const res = await query(sql, [screen_name, meta_event || null, tiktok_event || null, google_event || null, is_active, id]);
    
    if (res.rowCount === 0) return NextResponse.json({ error: 'Pixel event not found' }, { status: 404 });
    
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    
    if (!idStr) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const res = await query('DELETE FROM pixel_events WHERE id = $1 RETURNING id', [id]);
    
    if (res.rowCount === 0) return NextResponse.json({ error: 'Pixel event not found' }, { status: 404 });

    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
