import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let sql = 'SELECT * FROM payment_methods WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(code) LIKE $${params.length} OR LOWER(provider) LIKE $${params.length} OR LOWER(type) LIKE $${params.length})`;
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
    const { code, name, logo_url, type, provider, admin_fee_flat, admin_fee_pct, is_active, is_redirect } = body;

    // Sync sequence to avoid PK collision when rows were seeded with explicit IDs
    await query(`SELECT setval('payment_methods_id_seq', COALESCE((SELECT MAX(id) FROM payment_methods), 0))`);

    // Get max sort
    const maxSortRes = await query('SELECT MAX(sort_order) as max_sort FROM payment_methods');
    const sort_order = (maxSortRes.rows[0]?.max_sort || 0) + 1;

    const result = await query(
      `INSERT INTO payment_methods (code, name, logo_url, type, provider, admin_fee_flat, admin_fee_pct, is_active, is_redirect, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, logo_url || null, type, provider, admin_fee_flat || 0, admin_fee_pct || 0, is_active, is_redirect, sort_order]
    );

    await safeFlushCache();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/payment-methods]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // Handle reordering multiple records
    if (Array.isArray(body)) {
      await Promise.all(body.map(item => 
        query('UPDATE payment_methods SET sort_order = $1 WHERE id = $2', [item.sort_order, item.id])
      ));
      await safeFlushCache();
      return NextResponse.json({ message: 'Reordered successfully' });
    }

    // Handle single update
    const { id, code, name, logo_url, type, provider, admin_fee_flat, admin_fee_pct, is_active, is_redirect } = body;
    const result = await query(
      `UPDATE payment_methods 
       SET code = $1, name = $2, logo_url = $3, type = $4, provider = $5, admin_fee_flat = $6, admin_fee_pct = $7, is_active = $8, is_redirect = $9
       WHERE id = $10 RETURNING *`,
      [code, name, logo_url || null, type, provider, admin_fee_flat || 0, admin_fee_pct || 0, is_active, is_redirect, id]
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

    await query('DELETE FROM payment_methods WHERE id = $1', [id]);
    await safeFlushCache();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
