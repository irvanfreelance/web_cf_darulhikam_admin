import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const { campaign_id, title, excerpt, content, image_url } = await req.json();

    const result = await query(
      `UPDATE campaign_updates 
       SET campaign_id = $1, title = $2, excerpt = $3, content = $4, image_url = $5
       WHERE id = $6 RETURNING *`,
      [campaign_id, title, excerpt || null, content, image_url || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    await safeFlushCache();

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('API Campaign Updates [id] PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    await query('DELETE FROM campaign_updates WHERE id = $1', [id]);
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Campaign Updates [id] DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
