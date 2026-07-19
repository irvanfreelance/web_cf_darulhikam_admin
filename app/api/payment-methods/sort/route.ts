import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const { items } = await req.json(); // Array of { id: number, sort: number }
    if (!Array.isArray(items)) return NextResponse.json({ error: 'Invalid items array' }, { status: 400 });

    // Payment methods don't have secondary stats, simple loop is fine or transaction
    // Using simple loop with query for now, or we can use withTransaction for safety
    // Let's use withTransaction from our lib/db if available (it is)
    
    const { withTransaction } = await import('@/lib/db');
    
    await withTransaction(async (client) => {
      for (const item of items) {
        await client.query('UPDATE payment_methods SET sort = $1 WHERE id = $2', [item.sort, item.id]);
      }
    });

    await safeFlushCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API PM Sort Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
