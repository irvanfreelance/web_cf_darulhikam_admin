import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

const commissionSchema = z.object({
  affiliate_id: z.coerce.number().int().positive(),
  campaign_id: z.coerce.number().int().positive(),
  commission_type: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  commission_value: z.coerce.number().min(0),
});

// GET: list commissions for a specific affiliate
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const affiliate_id = searchParams.get('affiliate_id');
    if (!affiliate_id) {
      return NextResponse.json({ error: 'affiliate_id is required' }, { status: 400 });
    }
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sql = `
      SELECT 
        ac.affiliate_id,
        ac.campaign_id,
        ac.commission_type,
        ac.commission_value,
        c.title AS campaign_title,
        c.slug  AS campaign_slug,
        c.status AS campaign_status,
        COALESCE(acs.click_count, 0) as click_count,
        COALESCE(acs.converted_donors, 0) as converted_donors,
        COALESCE(acs.raised_amount, 0) as raised_amount,
        COALESCE(acs.commission_earned, 0) as commission_earned,
        COUNT(*) OVER() as total_count
      FROM affiliate_commissions ac
      JOIN campaigns c ON c.id = ac.campaign_id
      LEFT JOIN affiliate_campaign_stats acs ON acs.affiliate_id = ac.affiliate_id AND acs.campaign_id = ac.campaign_id
      WHERE ac.affiliate_id = $1
      ORDER BY c.title ASC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(sql, [affiliate_id, limit, offset]);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Affiliate Commissions GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: create a new commission rule (affiliate_id + campaign_id is PK)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = commissionSchema.parse(body);

    const sql = `
      INSERT INTO affiliate_commissions (affiliate_id, campaign_id, commission_type, commission_value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (affiliate_id, campaign_id) DO UPDATE
        SET commission_type  = EXCLUDED.commission_type,
            commission_value = EXCLUDED.commission_value
      RETURNING *
    `;
    const res = await query(sql, [
      validated.affiliate_id,
      validated.campaign_id,
      validated.commission_type,
      validated.commission_value,
    ]);
    await safeFlushCache();
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: update commission_type / commission_value for existing rule
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { affiliate_id, campaign_id, commission_type, commission_value } = body;
    if (!affiliate_id || !campaign_id)
      return NextResponse.json({ error: 'affiliate_id and campaign_id are required' }, { status: 400 });

    const validated = z.object({
      commission_type: z.enum(['PERCENTAGE', 'AMOUNT']).optional(),
      commission_value: z.coerce.number().min(0).optional(),
    }).parse({ commission_type, commission_value });

    const entries = Object.entries(validated).filter(([_, v]) => v !== undefined);
    if (entries.length === 0)
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    const setClause = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const params = entries.map(([_, v]) => v);
    params.push(affiliate_id, campaign_id);

    const sql = `
      UPDATE affiliate_commissions
      SET ${setClause}
      WHERE affiliate_id = $${params.length - 1} AND campaign_id = $${params.length}
      RETURNING *
    `;
    const res = await query(sql, params);
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove commission rule for a campaign
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const affiliate_id = searchParams.get('affiliate_id');
    const campaign_id = searchParams.get('campaign_id');
    if (!affiliate_id || !campaign_id)
      return NextResponse.json({ error: 'affiliate_id and campaign_id are required' }, { status: 400 });

    await query(
      'DELETE FROM affiliate_commissions WHERE affiliate_id = $1 AND campaign_id = $2',
      [affiliate_id, campaign_id]
    );
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
