import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const { items } = await req.json(); // Array of { id: number, sort: number }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty items array' }, { status: 400 });
    }

    await withTransaction(async (client) => {
      // Optimized batch update using VALUES list
      const values = items.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::int)`).join(', ');
      const params = items.flatMap(item => [item.id, item.sort]);
      
      const sql = `
        UPDATE campaigns AS c SET
          sort = v.sort
        FROM (VALUES ${values}) AS v(id, sort)
        WHERE c.id = v.id
      `;
      await client.query(sql, params);
    });

    await invalidateCache(['campaigns', 'campaigns_list', 'api:campaigns:carousel_v1']);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Campaigns Sort Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
