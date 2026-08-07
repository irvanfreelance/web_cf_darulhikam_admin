import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { safeFlushCache } from '@/lib/redis';
import { z } from 'zod';

const importRowSchema = z.object({
  campaign_id: z.coerce.number().int().positive('Campaign ID wajib diisi & positif'),
  payment_method_id: z.coerce.number().int().positive('Payment Method ID wajib diisi & positif'),
  donor_name_snapshot: z.string().min(1, 'Nama Donatur wajib diisi'),
  donor_email: z.string().email().optional().nullable().or(z.literal('')),
  donor_phone: z.string().optional().nullable(),
  amount: z.coerce.number().positive('Nominal transaksi harus lebih dari 0'),
  qty: z.coerce.number().int().positive().default(1),
  variant_id: z.coerce.number().optional().nullable(),
  status: z.enum(['PAID', 'PENDING', 'EXPIRED', 'CANCELLED']).default('PAID'),
  created_at: z.string().optional().nullable(),
  is_anonymous: z.boolean().default(false),
  doa: z.string().optional().nullable(),
  qurban_names: z.array(z.string()).optional().default([]),
  affiliate_id: z.coerce.number().optional().nullable(),
});

const bulkImportSchema = z.object({
  rows: z.array(importRowSchema).min(1, 'Array data transaksi tidak boleh kosong'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = bulkImportSchema.parse(body);
    const { rows } = validated;

    // 1. Fetch valid Campaign IDs & Payment Method IDs to validate existence in bulk
    const campaignsRes = await query('SELECT id, is_qurban FROM campaigns');
    const validCampaignMap = new Map<number, boolean>(
      campaignsRes.rows.map(c => [Number(c.id), Boolean(c.is_qurban)])
    );

    const pmRes = await query('SELECT id FROM payment_methods');
    const validPmSet = new Set<number>(pmRes.rows.map(pm => Number(pm.id)));

    let successCount = 0;
    let failCount = 0;
    const errors: { rowIndex: number; reason: string }[] = [];

    // 2. Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate existence
      if (!validCampaignMap.has(row.campaign_id)) {
        failCount++;
        errors.push({ rowIndex: rowNum, reason: `Campaign ID ${row.campaign_id} tidak ditemukan di database` });
        continue;
      }

      if (!validPmSet.has(row.payment_method_id)) {
        failCount++;
        errors.push({ rowIndex: rowNum, reason: `Payment Method ID ${row.payment_method_id} tidak ditemukan di database` });
        continue;
      }

      try {
        const transactionTime = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
        const paidAt = row.status === 'PAID' ? transactionTime : null;

        await withTransaction(async (client) => {
          // Donor Deduplication
          let finalDonorId: number | null = null;
          if (row.donor_phone || row.donor_email) {
            const donorFindRes = await client.query(
              `SELECT id FROM donors 
               WHERE (phone IS NOT NULL AND phone != '' AND phone = $1)
                  OR (email IS NOT NULL AND email != '' AND email = $2)
               LIMIT 1`,
              [row.donor_phone || '', row.donor_email || '']
            );
            if (donorFindRes.rows.length > 0) {
              finalDonorId = donorFindRes.rows[0].id;
            }
          }

          if (!finalDonorId) {
            const newDonorRes = await client.query(
              `INSERT INTO donors (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
              [row.donor_name_snapshot, row.donor_email || null, row.donor_phone || null]
            );
            finalDonorId = newDonorRes.rows[0].id;
          }

          // Generate Invoice Code
          const codeSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          const datePrefix = new Date(transactionTime).toISOString().slice(0, 10).replace(/-/g, '');
          const invoiceCode = `INV-IMPORT-${datePrefix}-${codeSuffix}`;

          // Insert Invoice
          const invRes = await client.query(
            `INSERT INTO invoices (
              invoice_code, donor_id, payment_method_id, donor_name_snapshot,
              donor_email, donor_phone, is_anonymous, base_amount, admin_fee,
              total_amount, status, doa, created_at, paid_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13)
            RETURNING id, created_at`,
            [
              invoiceCode,
              finalDonorId,
              row.payment_method_id,
              row.donor_name_snapshot,
              row.donor_email || null,
              row.donor_phone || null,
              row.is_anonymous,
              row.amount,
              row.amount,
              row.status,
              row.doa || null,
              transactionTime,
              paidAt,
            ]
          );
          const invoice = invRes.rows[0];

          // Insert Transaction
          const trxRes = await client.query(
            `INSERT INTO transactions (
              invoice_id, invoice_created_at, campaign_id, variant_id,
              affiliate_id, qty, amount, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, created_at`,
            [
              invoice.id,
              invoice.created_at,
              row.campaign_id,
              row.variant_id || null,
              row.affiliate_id || null,
              row.qty,
              row.amount,
              transactionTime,
            ]
          );
          const trx = trxRes.rows[0];

          // Insert Qurban Mudhohi Names if present
          if (row.qurban_names && row.qurban_names.length > 0) {
            const qurbanSql = `
              INSERT INTO transaction_qurban_names (
                transaction_id, transaction_created_at, mudhohi_name, created_at
              ) VALUES ($1, $2, $3, $4)
            `;
            for (const name of row.qurban_names) {
              if (name.trim()) {
                await client.query(qurbanSql, [trx.id, trx.created_at, name.trim(), transactionTime]);
              }
            }
          }

          // Update Campaign Stats if status is PAID
          if (row.status === 'PAID') {
            await client.query(
              `INSERT INTO campaign_stats (campaign_id, collected_amount, donor_count, package_sold, updated_at)
               VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
               ON CONFLICT (campaign_id) DO UPDATE SET
                 collected_amount = campaign_stats.collected_amount + EXCLUDED.collected_amount,
                 donor_count = campaign_stats.donor_count + 1,
                 package_sold = campaign_stats.package_sold + EXCLUDED.package_sold,
                 updated_at = CURRENT_TIMESTAMP`,
              [row.campaign_id, row.amount, row.qty]
            );
          }
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push({ rowIndex: rowNum, reason: err.message || 'Gagal menyimpan transaksi' });
      }
    }

    await safeFlushCache();

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      successCount,
      failCount,
      errors,
    });
  } catch (error: any) {
    console.error('API Bulk Import Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
