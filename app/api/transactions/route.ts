import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

// Zod Validation Schemas
const getTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().nonnegative().default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  minAmount: z.string().optional().nullable(),
  maxAmount: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  type: z.enum(['invoices', 'transactions']).default('invoices'),
  affiliateId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
});

const patchInvoiceSchema = z.object({
  id: z.coerce.number().int().positive(),
  created_at: z.string(),
  status: z.string(),
});

const deleteInvoiceSchema = z.object({
  id: z.coerce.number().int().positive(),
  created_at: z.string(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParamsObj = Object.fromEntries(searchParams.entries());
    const validated = getTransactionsQuerySchema.parse(queryParamsObj);

    const {
      limit,
      offset,
      status,
      search,
      minAmount,
      maxAmount,
      campaignId,
      startDate,
      endDate,
      type,
      affiliateId,
      paymentMethodId,
    } = validated;
    
    if (type === 'transactions') {
      let sql = `
        SELECT 
          t.id, t.amount, t.qty, t.affiliate_commission, t.created_at,
          i.invoice_code, i.donor_name_snapshot, i.status,
          c.title as campaign_title,
          a.name as affiliate_name, a.affiliate_code,
          COUNT(*) OVER() as total_count
        FROM transactions t
        JOIN invoices i ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
        JOIN campaigns c ON t.campaign_id = c.id
        LEFT JOIN affiliates a ON t.affiliate_id = a.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (startDate) {
        sql += ` AND t.created_at >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        sql += ` AND t.created_at <= $${params.length + 1}`;
        params.push(endDate);
      }
      if (status && status !== 'ALL') {
        sql += ` AND i.status = $${params.length + 1}`;
        params.push(status);
      }
      if (search) {
        const cleanSearch = search.replace(/[^0-9]/g, '');
        let searchCond = `(i.invoice_code ILIKE $${params.length + 1} 
          OR i.donor_name_snapshot ILIKE $${params.length + 1} 
          OR a.name ILIKE $${params.length + 1}
          OR a.affiliate_code ILIKE $${params.length + 1}
          OR c.title ILIKE $${params.length + 1}`;
        
        if (cleanSearch !== '') {
          searchCond += ` OR t.amount::text ILIKE $${params.length + 2} OR t.affiliate_commission::text ILIKE $${params.length + 2}`;
          params.push(`%${search}%`, `%${cleanSearch}%`);
        } else {
          params.push(`%${search}%`);
        }
        searchCond += `)`;
        sql += ` AND ${searchCond}`;
      }
      if (campaignId) {
        sql += ` AND t.campaign_id = $${params.length + 1}`;
        params.push(campaignId);
      }
      if (affiliateId) {
        sql += ` AND t.affiliate_id = $${params.length + 1}`;
        params.push(affiliateId);
      }
      
      sql += `
        ORDER BY t.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      params.push(limit, offset);
      
      const res = await query(sql, params);
      return NextResponse.json(res.rows);
    }
    
    // Default Invoices View
    let sql = `
      SELECT 
        i.id, i.invoice_code, i.donor_name_snapshot, i.total_amount, 
        i.status, i.created_at, i.paid_at,
        i.is_wa_checkout_sent, i.is_wa_paid_sent, 
        i.is_email_checkout_sent, i.is_email_paid_sent, 
        i.is_ads_sent, i.proof_transfer,
        pm.name as payment_method,
        pm.logo_url as payment_method_logo,
        pm.id as payment_method_id,
        JSONB_AGG(DISTINCT jsonb_build_object('id', c.id, 'title', c.title)) FILTER (WHERE c.id IS NOT NULL) as campaigns,
        COUNT(*) OVER() as total_count
      FROM invoices i
      JOIN payment_methods pm ON i.payment_method_id = pm.id
      LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
      LEFT JOIN campaigns c ON t.campaign_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (startDate) {
      sql += ` AND i.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND i.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    if (status && status !== 'ALL') {
      sql += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    if (paymentMethodId) {
      sql += ` AND i.payment_method_id = $${params.length + 1}`;
      params.push(paymentMethodId);
    }

    if (search) {
      const cleanSearch = search.replace(/[^0-9]/g, '');
      let searchCond = `(i.invoice_code ILIKE $${params.length + 1} 
        OR i.donor_name_snapshot ILIKE $${params.length + 1}
        OR pm.name ILIKE $${params.length + 1}
        OR c.title ILIKE $${params.length + 1}`;
      
      if (cleanSearch !== '') {
        searchCond += ` OR i.total_amount::text ILIKE $${params.length + 2}`;
        params.push(`%${search}%`, `%${cleanSearch}%`);
      } else {
        params.push(`%${search}%`);
      }
      searchCond += `)`;
      sql += ` AND ${searchCond}`;
    }

    if (minAmount) {
      sql += ` AND i.total_amount >= $${params.length + 1}`;
      params.push(minAmount);
    }

    if (maxAmount) {
      sql += ` AND i.total_amount <= $${params.length + 1}`;
      params.push(maxAmount);
    }

    if (campaignId) {
      sql += ` AND t.campaign_id = $${params.length + 1}`;
      params.push(campaignId);
    }
    
    sql += `
      GROUP BY 
        i.id, i.invoice_code, i.donor_name_snapshot, i.total_amount, i.status, i.created_at, i.paid_at, 
        i.is_wa_checkout_sent, i.is_wa_paid_sent, i.is_email_checkout_sent, i.is_email_paid_sent, i.is_ads_sent, i.proof_transfer,
        pm.name, pm.logo_url, pm.id
      ORDER BY i.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Transactions Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const validated = patchInvoiceSchema.parse(body);
    const { id, created_at, status } = validated;

    const sql = `UPDATE invoices SET status = $1 WHERE id = $2 AND created_at = $3 RETURNING *`;
    const res = await query(sql, [status, id, created_at]);

    if (res.rowCount === 0) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    
    await safeFlushCache();
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParamsObj = Object.fromEntries(searchParams.entries());
    const validated = deleteInvoiceSchema.parse(queryParamsObj);
    const { id, created_at } = validated;

    await query('DELETE FROM invoices WHERE id = $1 AND created_at = $2', [id, created_at]);
    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
