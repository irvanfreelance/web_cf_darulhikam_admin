import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Fetch Campaign Details & Stats
    const campSql = `
      SELECT 
        c.*, 
        cat.name as category_name, cat.color_theme as category_color,
        cs.collected_amount, cs.donor_count, cs.views_count, cs.package_sold
      FROM campaigns c
      JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN campaign_stats cs ON c.id = cs.campaign_id
      WHERE c.id = $1
    `;
    const campRes = await query(campSql, [id]);
    if (campRes.rowCount === 0) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    const campaign = campRes.rows[0];

    // 2. Fetch Daily Stats (Last 7 Days)
    const chartSql = `
      SELECT 
        TO_CHAR(d.date, 'Dy') as name,
        COALESCE(SUM(t.amount), 0) as amount
      FROM (
        SELECT CURRENT_DATE - i as date
        FROM generate_series(0, 6) i
      ) d
      LEFT JOIN transactions t ON TO_CHAR(t.created_at, 'YYYY-MM-DD') = TO_CHAR(d.date, 'YYYY-MM-DD') AND t.campaign_id = $1
      GROUP BY d.date
      ORDER BY d.date ASC
    `;
    const chartRes = await query(chartSql, [id]);

    // 3. Fetch Recent Transactions
    const trxSql = `
      SELECT 
        i.invoice_code, i.donor_name_snapshot, i.created_at as time,
        t.amount, i.status
      FROM transactions t
      JOIN invoices i ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
      WHERE t.campaign_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `;
    const trxRes = await query(trxSql, [id]);

    // 4. Fetch Updates
    const updatesSql = `SELECT * FROM campaign_updates WHERE campaign_id = $1 ORDER BY created_at DESC`;
    const updatesRes = await query(updatesSql, [id]);

    // 5. Fetch Variants
    const variantsSql = `SELECT * FROM campaign_variants WHERE campaign_id = $1 ORDER BY price ASC`;
    const variantsRes = await query(variantsSql, [id]);

    // 6. Fetch Bundles
    const bundlesSql = `
      SELECT cb.*, c.title as item_title 
      FROM campaign_bundles cb
      JOIN campaigns c ON cb.item_campaign_id = c.id
      WHERE cb.bundle_campaign_id = $1
    `;
    const bundlesRes = await query(bundlesSql, [id]);

    // 7. Fetch QRIS Static
    const qrisSql = `SELECT * FROM campaign_qris_static WHERE campaign_id = $1`;
    const qrisRes = await query(qrisSql, [id]);

    return NextResponse.json({
      ...campaign,
      chartData: chartRes.rows,
      transactions: trxRes.rows,
      updates: updatesRes.rows,
      variants: variantsRes.rows,
      bundles: bundlesRes.rows,
      qris_static: qrisRes.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { variants, bundles, qris_static } = body;

    await withTransaction(async (client) => {
      // Manage Variants
      if (variants) {
        await client.query('DELETE FROM campaign_variants WHERE campaign_id = $1', [id]);
        if (variants.length > 0) {
          const vSql = 'INSERT INTO campaign_variants (campaign_id, name, price, names_per_qty, stock_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6)';
          for (const v of variants) {
            await client.query(vSql, [id, v.name, v.price, v.names_per_qty || 1, v.stock_limit || null, v.is_active ?? true]);
          }
        }
      }

      // Manage Bundles
      if (bundles) {
        await client.query('DELETE FROM campaign_bundles WHERE bundle_campaign_id = $1', [id]);
        if (bundles.length > 0) {
          const bSql = 'INSERT INTO campaign_bundles (bundle_campaign_id, item_campaign_id, qty) VALUES ($1, $2, $3)';
          for (const b of bundles) {
            await client.query(bSql, [id, b.item_campaign_id, b.qty || 1]);
          }
        }
      }

      // Manage QRIS Static
      if (qris_static) {
        await client.query('DELETE FROM campaign_qris_static WHERE campaign_id = $1', [id]);
        if (qris_static.length > 0) {
          const qSql = 'INSERT INTO campaign_qris_static (campaign_id, external_id, qris_string, status) VALUES ($1, $2, $3, $4)';
          for (const q of qris_static) {
            await client.query(qSql, [id, q.external_id, q.qris_string, q.status || 'ACTIVE']);
          }
        }
      }
    });

    try {
      await invalidateCache(['campaigns', 'campaigns_list']);
    } catch (re) {
      console.warn('Redis flush error in [id] route:', re);
    }

    return NextResponse.json({ success: true, message: 'Data berelasi berhasil disimpan.'});
  } catch (error: any) {
    console.error('API Campaign [id] PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
