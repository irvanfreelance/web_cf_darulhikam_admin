import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

const withdrawalSchema = z.object({
  affiliate_id: z.number(),
  amount: z.number().positive(),
  bank_account_info: z.string().min(5),
  status: z.string().default('PENDING'),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const affiliateIdFilter = searchParams.get('affiliate_id');

    let sql = `
      SELECT 
        w.*,
        a.name as affiliate_name,
        a.affiliate_code,
        COUNT(*) OVER() as total_count
      FROM withdrawals w
      JOIN affiliates a ON w.affiliate_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (affiliateIdFilter) {
      sql += ` AND w.affiliate_id = $${params.length + 1}`;
      params.push(Number(affiliateIdFilter));
    }

    if (search) {
      sql += ` AND (a.name ILIKE $${params.length + 1} OR a.affiliate_code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (status && status !== 'ALL') {
      sql += ` AND w.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += `
      ORDER BY w.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Withdrawals Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = withdrawalSchema.parse(body);
    
    // Check balance
    const affRes = await query('SELECT balance FROM affiliates WHERE id = $1', [validated.affiliate_id]);
    if (affRes.rowCount === 0) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    
    if (affRes.rows[0].balance < validated.amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const sql = `
      INSERT INTO withdrawals (affiliate_id, amount, bank_account_info, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const res = await query(sql, [validated.affiliate_id, validated.amount, validated.bank_account_info, validated.status]);
    
    await safeFlushCache();
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const validated = withdrawalSchema.partial().parse(data);
    const entries = Object.entries(validated).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    const setClause = entries.map(([k, _], i) => `${k} = $${i + 1}`).join(', ');
    const params = entries.map(([_, v]) => v);
    params.push(id);

    const sql = `UPDATE withdrawals SET ${setClause}, processed_at = CASE WHEN $${params.length-1} = 'PROCESSED' THEN CURRENT_TIMESTAMP ELSE processed_at END WHERE id = $${params.length} RETURNING *`;
    // Note: status is at index params.length-1 in this logic if status was updated. 
    // Simplified:
    const updateRes = await query(`UPDATE withdrawals SET ${setClause} WHERE id = $${params.length} RETURNING *`, params);

    // If status became PROCESSED, subtract from balance in a transaction
    if (validated.status === 'PROCESSED') {
       const row = updateRes.rows[0];
       await query('UPDATE affiliates SET balance = balance - $1 WHERE id = $2', [row.amount, row.affiliate_id]);
       await query('UPDATE withdrawals SET processed_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }

    await safeFlushCache();
    return NextResponse.json(updateRes.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query('DELETE FROM withdrawals WHERE id = $1', [id]);
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
