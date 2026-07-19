import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const sql = `
      SELECT
        a.*,
        COALESCE((SELECT SUM(converted_donors) FROM affiliate_campaign_stats WHERE affiliate_id = a.id), 0) as converted_donors,
        COALESCE((SELECT SUM(raised_amount) FROM affiliate_campaign_stats WHERE affiliate_id = a.id), 0) as raised_amount
      FROM affiliates a
      WHERE a.id = $1
    `;

    const res = await query(sql, [id]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Affiliate tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('API Affiliate [id] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
