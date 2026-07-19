import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const payment_method_id = searchParams.get('payment_method_id');

    let sql = 'SELECT * FROM payment_instructions WHERE 1=1';
    const params: any[] = [];

    if (payment_method_id) {
      params.push(payment_method_id);
      sql += ` AND payment_method_id = $${params.length}`;
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const items = await query(sql, params);
    return NextResponse.json(items.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { payment_method_id, title, content } = body;

    // Get max sort
    const maxSortRes = await query('SELECT MAX(sort_order) as max_sort FROM payment_instructions WHERE payment_method_id = $1', [payment_method_id]);
    const sort_order = (maxSortRes.rows[0]?.max_sort || 0) + 1;

    const result = await query(
      `INSERT INTO payment_instructions (payment_method_id, title, content, sort_order) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [payment_method_id, title, content, sort_order]
    );

    await safeFlushCache();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // Handle reordering multiple records
    if (Array.isArray(body)) {
      await Promise.all(body.map(item => 
        query('UPDATE payment_instructions SET sort_order = $1 WHERE id = $2', [item.sort_order, item.id])
      ));
      await safeFlushCache();
      return NextResponse.json({ message: 'Reordered successfully' });
    }

    // Handle single update
    const { id, title, content } = body;
    const result = await query(
      `UPDATE payment_instructions 
       SET title = $1, content = $2
       WHERE id = $3 RETURNING *`,
      [title, content, id]
    );

    await safeFlushCache();

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query('DELETE FROM payment_instructions WHERE id = $1', [id]);
    await safeFlushCache();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
