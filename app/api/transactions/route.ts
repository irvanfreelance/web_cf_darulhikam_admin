import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
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

const createTransactionSchema = z.object({
  campaign_id: z.coerce.number().int().positive(),
  created_at: z.string().optional().nullable(),
  payment_method_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  donor_id: z.coerce.number().optional().nullable(),
  donor_name_snapshot: z.string().min(1, "Nama donatur wajib diisi"),
  donor_email: z.string().email().optional().nullable().or(z.literal('')),
  donor_phone: z.string().optional().nullable(),
  is_anonymous: z.boolean().default(false),
  status: z.enum(['PAID', 'PENDING', 'EXPIRED', 'CANCELLED']).default('PAID'),
  doa: z.string().optional().nullable(),
  affiliate_id: z.coerce.number().optional().nullable(),
  variant_id: z.coerce.number().optional().nullable(),
  qty: z.coerce.number().int().positive().default(1),
  qurban_names: z.array(z.string()).optional().default([]),
});

const updateTransactionSchema = createTransactionSchema.extend({
  id: z.coerce.number().int().positive(),
  created_at: z.string(),
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
        i.id, i.invoice_code, i.donor_name_snapshot, i.donor_email, i.donor_phone, i.donor_id,
        i.total_amount, i.base_amount, i.is_anonymous, i.doa,
        i.status, i.created_at, i.paid_at,
        i.is_wa_checkout_sent, i.is_wa_paid_sent, 
        i.is_email_checkout_sent, i.is_email_paid_sent, 
        i.is_ads_sent, i.proof_transfer,
        pm.name as payment_method,
        pm.logo_url as payment_method_logo,
        pm.id as payment_method_id,
        JSONB_AGG(DISTINCT jsonb_build_object('id', c.id, 'title', c.title, 'is_qurban', c.is_qurban, 'is_zakat', c.is_zakat)) FILTER (WHERE c.id IS NOT NULL) as campaigns,
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
        i.id, i.invoice_code, i.donor_name_snapshot, i.donor_email, i.donor_phone, i.donor_id,
        i.total_amount, i.base_amount, i.is_anonymous, i.doa, i.status, i.created_at, i.paid_at, 
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

/**
 * POST /api/transactions
 * Create a new manual transaction with donor deduplication & campaign stats sync
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createTransactionSchema.parse(body);

    const transactionTime = validated.created_at ? new Date(validated.created_at).toISOString() : new Date().toISOString();
    const paidAt = validated.status === 'PAID' ? transactionTime : null;

    const result = await withTransaction(async (client) => {
      // 1. Donor Deduplication / Lookup
      let finalDonorId = validated.donor_id || null;
      if (!finalDonorId) {
        if (validated.donor_phone || validated.donor_email) {
          const donorFindSql = `
            SELECT id FROM donors 
            WHERE (phone IS NOT NULL AND phone != '' AND phone = $1)
               OR (email IS NOT NULL AND email != '' AND email = $2)
            LIMIT 1
          `;
          const donorRes = await client.query(donorFindSql, [validated.donor_phone || '', validated.donor_email || '']);
          if (donorRes.rows.length > 0) {
            finalDonorId = donorRes.rows[0].id;
          }
        }
        
        if (!finalDonorId) {
          const donorInsertSql = `INSERT INTO donors (name, email, phone) VALUES ($1, $2, $3) RETURNING id`;
          const newDonorRes = await client.query(donorInsertSql, [
            validated.donor_name_snapshot,
            validated.donor_email || null,
            validated.donor_phone || null,
          ]);
          finalDonorId = newDonorRes.rows[0].id;
        }
      }

      // 2. Generate Unique Invoice Code
      const codeSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const datePrefix = new Date(transactionTime).toISOString().slice(0, 10).replace(/-/g, '');
      const invoiceCode = `INV-MANUAL-${datePrefix}-${codeSuffix}`;

      // 3. Insert Invoice
      const invoiceSql = `
        INSERT INTO invoices (
          invoice_code, donor_id, payment_method_id, donor_name_snapshot,
          donor_email, donor_phone, is_anonymous, base_amount, admin_fee,
          total_amount, status, doa, created_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const invoiceRes = await client.query(invoiceSql, [
        invoiceCode,
        finalDonorId,
        validated.payment_method_id,
        validated.donor_name_snapshot,
        validated.donor_email || null,
        validated.donor_phone || null,
        validated.is_anonymous,
        validated.amount,
        0, // admin fee
        validated.amount,
        validated.status,
        validated.doa || null,
        transactionTime,
        paidAt,
      ]);
      const invoice = invoiceRes.rows[0];

      // 4. Insert Transaction
      const trxSql = `
        INSERT INTO transactions (
          invoice_id, invoice_created_at, campaign_id, variant_id,
          affiliate_id, qty, amount, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const trxRes = await client.query(trxSql, [
        invoice.id,
        invoice.created_at,
        validated.campaign_id,
        validated.variant_id || null,
        validated.affiliate_id || null,
        validated.qty,
        validated.amount,
        transactionTime,
      ]);
      const trx = trxRes.rows[0];

      // 5. Insert Qurban Mudhohi Names if present
      if (validated.qurban_names && validated.qurban_names.length > 0) {
        const qurbanSql = `
          INSERT INTO transaction_qurban_names (
            transaction_id, transaction_created_at, mudhohi_name, created_at
          ) VALUES ($1, $2, $3, $4)
        `;
        for (const name of validated.qurban_names) {
          if (name.trim()) {
            await client.query(qurbanSql, [trx.id, trx.created_at, name.trim(), transactionTime]);
          }
        }
      }

      // 6. Update Campaign Stats if status is PAID
      if (validated.status === 'PAID') {
        const statsSql = `
          INSERT INTO campaign_stats (campaign_id, collected_amount, donor_count, package_sold, updated_at)
          VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (campaign_id) DO UPDATE SET
            collected_amount = campaign_stats.collected_amount + EXCLUDED.collected_amount,
            donor_count = campaign_stats.donor_count + 1,
            package_sold = campaign_stats.package_sold + EXCLUDED.package_sold,
            updated_at = CURRENT_TIMESTAMP
        `;
        await client.query(statsSql, [validated.campaign_id, validated.amount, validated.qty]);
      }

      return { invoice, transaction: trx };
    });

    await safeFlushCache();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('API Transactions POST Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/transactions
 * Edit an existing transaction with status sync & campaign stats update
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // If it's a simple status toggle from table view
    if (body.id && body.created_at && Object.keys(body).length === 3 && body.status) {
      const validated = patchInvoiceSchema.parse(body);
      const { id, created_at, status } = validated;

      const updatedInvoice = await withTransaction(async (client) => {
        // Fetch current invoice status & transaction info
        const curRes = await client.query(
          `SELECT i.status, t.campaign_id, t.amount, t.qty 
           FROM invoices i 
           LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
           WHERE i.id = $1 AND i.created_at = $2`,
          [id, created_at]
        );
        if (curRes.rows.length === 0) throw new Error('Invoice not found');

        const cur = curRes.rows[0];
        const oldStatus = cur.status;
        const paidAt = status === 'PAID' ? new Date().toISOString() : null;

        const res = await client.query(
          `UPDATE invoices SET status = $1, paid_at = $2 WHERE id = $3 AND created_at = $4 RETURNING *`,
          [status, paidAt, id, created_at]
        );

        // Adjust campaign_stats if status changed to/from PAID
        if (cur.campaign_id) {
          if (oldStatus !== 'PAID' && status === 'PAID') {
            await client.query(
              `INSERT INTO campaign_stats (campaign_id, collected_amount, donor_count, package_sold, updated_at)
               VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
               ON CONFLICT (campaign_id) DO UPDATE SET
                 collected_amount = campaign_stats.collected_amount + EXCLUDED.collected_amount,
                 donor_count = campaign_stats.donor_count + 1,
                 package_sold = campaign_stats.package_sold + EXCLUDED.package_sold,
                 updated_at = CURRENT_TIMESTAMP`,
              [cur.campaign_id, cur.amount, cur.qty]
            );
          } else if (oldStatus === 'PAID' && status !== 'PAID') {
            await client.query(
              `UPDATE campaign_stats SET
                 collected_amount = GREATEST(0, collected_amount - $1),
                 donor_count = GREATEST(0, donor_count - 1),
                 package_sold = GREATEST(0, package_sold - $2),
                 updated_at = CURRENT_TIMESTAMP
               WHERE campaign_id = $3`,
              [cur.amount, cur.qty, cur.campaign_id]
            );
          }
        }

        return res.rows[0];
      });

      await safeFlushCache();
      return NextResponse.json(updatedInvoice);
    }

    // Full Manual Edit
    const validated = updateTransactionSchema.parse(body);
    const { id, created_at } = validated;

    const result = await withTransaction(async (client) => {
      // 1. Fetch current transaction & invoice details
      const curRes = await client.query(
        `SELECT i.*, t.id as trx_id, t.created_at as trx_created_at, t.campaign_id as old_campaign_id, t.amount as old_amount, t.qty as old_qty 
         FROM invoices i 
         JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
         WHERE i.id = $1 AND i.created_at = $2`,
        [id, created_at]
      );
      if (curRes.rows.length === 0) throw new Error('Invoice / Transaction not found');

      const oldRec = curRes.rows[0];

      // 2. Donor Deduplication / Lookup
      let finalDonorId = validated.donor_id || null;
      if (!finalDonorId) {
        if (validated.donor_phone || validated.donor_email) {
          const donorFindSql = `
            SELECT id FROM donors 
            WHERE (phone IS NOT NULL AND phone != '' AND phone = $1)
               OR (email IS NOT NULL AND email != '' AND email = $2)
            LIMIT 1
          `;
          const donorRes = await client.query(donorFindSql, [validated.donor_phone || '', validated.donor_email || '']);
          if (donorRes.rows.length > 0) {
            finalDonorId = donorRes.rows[0].id;
          }
        }
        
        if (!finalDonorId) {
          const donorInsertSql = `INSERT INTO donors (name, email, phone) VALUES ($1, $2, $3) RETURNING id`;
          const newDonorRes = await client.query(donorInsertSql, [
            validated.donor_name_snapshot,
            validated.donor_email || null,
            validated.donor_phone || null,
          ]);
          finalDonorId = newDonorRes.rows[0].id;
        }
      }

      // 3. Deduct old stats if old status was PAID
      if (oldRec.status === 'PAID' && oldRec.old_campaign_id) {
        await client.query(
          `UPDATE campaign_stats SET
             collected_amount = GREATEST(0, collected_amount - $1),
             donor_count = GREATEST(0, donor_count - 1),
             package_sold = GREATEST(0, package_sold - $2),
             updated_at = CURRENT_TIMESTAMP
           WHERE campaign_id = $3`,
          [oldRec.old_amount, oldRec.old_qty, oldRec.old_campaign_id]
        );
      }

      const paidAt = validated.status === 'PAID' ? (oldRec.paid_at || new Date().toISOString()) : null;

      // 4. Update Invoice
      const invUpdateSql = `
        UPDATE invoices SET
          payment_method_id = $1,
          donor_name_snapshot = $2,
          donor_email = $3,
          donor_phone = $4,
          is_anonymous = $5,
          base_amount = $6,
          total_amount = $7,
          status = $8,
          doa = $9,
          donor_id = $10,
          paid_at = $11
        WHERE id = $12 AND created_at = $13
        RETURNING *
      `;
      const invRes = await client.query(invUpdateSql, [
        validated.payment_method_id,
        validated.donor_name_snapshot,
        validated.donor_email || null,
        validated.donor_phone || null,
        validated.is_anonymous,
        validated.amount,
        validated.amount,
        validated.status,
        validated.doa || null,
        finalDonorId,
        paidAt,
        id,
        created_at,
      ]);

      // 5. Update Transaction
      const trxUpdateSql = `
        UPDATE transactions SET
          campaign_id = $1,
          variant_id = $2,
          affiliate_id = $3,
          qty = $4,
          amount = $5
        WHERE invoice_id = $6 AND invoice_created_at = $7
        RETURNING *
      `;
      const trxRes = await client.query(trxUpdateSql, [
        validated.campaign_id,
        validated.variant_id || null,
        validated.affiliate_id || null,
        validated.qty,
        validated.amount,
        id,
        created_at,
      ]);

      // 6. Update Qurban Mudhohi Names
      await client.query(
        `DELETE FROM transaction_qurban_names WHERE transaction_id = $1 AND transaction_created_at = $2`,
        [oldRec.trx_id, oldRec.trx_created_at]
      );

      if (validated.qurban_names && validated.qurban_names.length > 0) {
        const qurbanSql = `
          INSERT INTO transaction_qurban_names (
            transaction_id, transaction_created_at, mudhohi_name, created_at
          ) VALUES ($1, $2, $3, $4)
        `;
        for (const name of validated.qurban_names) {
          if (name.trim()) {
            await client.query(qurbanSql, [oldRec.trx_id, oldRec.trx_created_at, name.trim(), oldRec.created_at]);
          }
        }
      }

      // 7. Add new stats if new status is PAID
      if (validated.status === 'PAID') {
        await client.query(
          `INSERT INTO campaign_stats (campaign_id, collected_amount, donor_count, package_sold, updated_at)
           VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (campaign_id) DO UPDATE SET
             collected_amount = campaign_stats.collected_amount + EXCLUDED.collected_amount,
             donor_count = campaign_stats.donor_count + 1,
             package_sold = campaign_stats.package_sold + EXCLUDED.package_sold,
             updated_at = CURRENT_TIMESTAMP`,
          [validated.campaign_id, validated.amount, validated.qty]
        );
      }

      return { invoice: invRes.rows[0], transaction: trxRes.rows[0] };
    });

    await safeFlushCache();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Transactions PATCH Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/transactions
 * Delete invoice and associated transaction & qurban names safely
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParamsObj = Object.fromEntries(searchParams.entries());
    const validated = deleteInvoiceSchema.parse(queryParamsObj);
    const { id, created_at } = validated;

    await withTransaction(async (client) => {
      // 1. Fetch transaction details to deduct campaign stats if status was PAID
      const curRes = await client.query(
        `SELECT i.status, t.id as trx_id, t.created_at as trx_created_at, t.campaign_id, t.amount, t.qty 
         FROM invoices i 
         LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
         WHERE i.id = $1 AND i.created_at = $2`,
        [id, created_at]
      );

      if (curRes.rows.length > 0) {
        const cur = curRes.rows[0];

        // Deduct campaign_stats if status was PAID
        if (cur.status === 'PAID' && cur.campaign_id) {
          await client.query(
            `UPDATE campaign_stats SET
               collected_amount = GREATEST(0, collected_amount - $1),
               donor_count = GREATEST(0, donor_count - 1),
               package_sold = GREATEST(0, package_sold - $2),
               updated_at = CURRENT_TIMESTAMP
             WHERE campaign_id = $3`,
            [cur.amount, cur.qty, cur.campaign_id]
          );
        }

        // Delete Qurban names if any
        if (cur.trx_id) {
          await client.query(
            `DELETE FROM transaction_qurban_names WHERE transaction_id = $1 AND transaction_created_at = $2`,
            [cur.trx_id, cur.trx_created_at]
          );
        }
      }

      // Delete transactions
      await client.query('DELETE FROM transactions WHERE invoice_id = $1 AND invoice_created_at = $2', [id, created_at]);

      // Delete invoice
      await client.query('DELETE FROM invoices WHERE id = $1 AND created_at = $2', [id, created_at]);
    });

    await safeFlushCache();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Transactions DELETE Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
