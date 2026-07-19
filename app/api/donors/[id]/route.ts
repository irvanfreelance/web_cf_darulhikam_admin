import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Fetch Donor Base Info
    const donorSql = `
      SELECT * 
      FROM donors
      WHERE id = $1
    `;
    const donorRes = await query(donorSql, [id]);
    if (donorRes.rowCount === 0) return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
    const donor = donorRes.rows[0];

    // 2. Fetch Invoices Related to Donor
    const invoicesSql = `
      SELECT i.id, i.invoice_code, i.total_amount, i.status, i.created_at, i.paid_at,
             pm.name as payment_method_name,
             c.title as campaign_title
      FROM invoices i
      LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
      LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
      LEFT JOIN campaigns c ON t.campaign_id = c.id
      WHERE i.donor_id = $1
      ORDER BY i.created_at DESC
    `;
    const invoicesRes = await query(invoicesSql, [id]);

    // 3. Compute Aggregates
    const aggSql = `
      SELECT 
        COUNT(id) as total_invoices,
        SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as total_donated,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices
      FROM invoices
      WHERE donor_id = $1
    `;
    const aggRes = await query(aggSql, [id]);
    const stats = aggRes.rows[0];

    return NextResponse.json({
      ...donor,
      stats: {
         total_invoices: parseInt(stats.total_invoices || '0'),
         total_donated: parseInt(stats.total_donated || '0'),
         paid_invoices: parseInt(stats.paid_invoices || '0'),
      },
      invoices: invoicesRes.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
