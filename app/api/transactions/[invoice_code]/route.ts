import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ invoice_code: string }> }) {
  try {
    const { invoice_code } = await params;

    // 1. Fetch Master Invoice
    const invoiceSql = `
      SELECT i.*, 
             d.name as donor_name, d.email as donor_email, d.phone as donor_phone,
             pm.name as payment_method_name, pm.type as payment_method_type,
             c.title as campaign_title, c.slug as campaign_slug,
             t.amount as transaction_amount, t.qty as transaction_qty, t.created_at as transaction_time,
             cv.name as variant_name
      FROM invoices i
      LEFT JOIN donors d ON i.donor_id = d.id
      LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
      LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
      LEFT JOIN campaigns c ON t.campaign_id = c.id
      LEFT JOIN campaign_variants cv ON t.variant_id = cv.id
      WHERE i.invoice_code = $1
    `;
    const invoiceRes = await query(invoiceSql, [invoice_code]);
    if (invoiceRes.rowCount === 0) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const invoice = invoiceRes.rows[0];

    // 2. Fetch Qurban Names (if any)
    const qurbanSql = `
      SELECT tqn.* 
      FROM transaction_qurban_names tqn
      JOIN transactions t ON tqn.transaction_id = t.id AND tqn.transaction_created_at = t.created_at
      WHERE t.invoice_id = $1
    `;
    const qurbanRes = await query(qurbanSql, [invoice.id]);

    // 3. Fetch Payment Logs
    const paymentLogsSql = `SELECT * FROM payment_logs WHERE invoice_code = $1 ORDER BY created_at DESC`;
    const paymentLogsRes = await query(paymentLogsSql, [invoice_code]);

    // 4. Fetch Notification Logs
    const notificationLogsSql = `SELECT * FROM notification_logs WHERE invoice_code = $1 ORDER BY created_at DESC`;
    const notificationLogsRes = await query(notificationLogsSql, [invoice_code]);

    // 5. Fetch Ads Conversion Logs
    const adsLogsSql = `SELECT * FROM ads_conversion_logs WHERE invoice_code = $1 ORDER BY id DESC`;
    const adsLogsRes = await query(adsLogsSql, [invoice_code]);

    return NextResponse.json({
      ...invoice,
      qurban_names: qurbanRes.rows,
      payment_logs: paymentLogsRes.rows,
      notification_logs: notificationLogsRes.rows,
      ads_conversion_logs: adsLogsRes.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
