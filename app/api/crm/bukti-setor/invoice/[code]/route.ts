import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const [invoice, org] = await Promise.all([
      query(
        `SELECT i.id, i.created_at, i.invoice_code, i.donor_name_snapshot, i.donor_email, i.donor_phone,
                i.base_amount, i.admin_fee, i.total_amount, i.paid_at, i.status,
                COALESCE(string_agg(DISTINCT c.title, ', '), '') AS campaign_title
         FROM invoices i
         LEFT JOIN transactions t ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
         LEFT JOIN campaigns c ON c.id = t.campaign_id
         WHERE i.invoice_code = $1 AND i.status = 'PAID'
         GROUP BY i.id, i.created_at
         ORDER BY i.created_at DESC
         LIMIT 1`,
        [code]
      ),
      query(`SELECT ngo_name, address FROM ngo_configs LIMIT 1`),
    ]);
    if (invoice.rowCount === 0) return NextResponse.json({ error: 'Invoice lunas tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ invoice: invoice.rows[0], org: org.rows[0] || { ngo_name: 'LAZ Darul Hikam' } });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
