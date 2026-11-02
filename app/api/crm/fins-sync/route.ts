import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseQuery } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';
import { JournalError, postBalancedEntry } from '@/lib/fins/post-journal';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
});

const PAID_SQL = `
  SELECT i.id, i.created_at, i.invoice_code, i.base_amount, i.total_amount,
         i.donor_name_snapshot, COALESCE(i.paid_at, i.created_at) AS tgl,
         pm.fins_coa_debet,
         (
           SELECT m.coa_receipt
           FROM transactions t
           JOIN fins_campaign_coa m ON m.campaign_id = t.campaign_id
           WHERE t.invoice_id = i.id AND t.invoice_created_at = i.created_at
             AND COALESCE(m.coa_receipt, '') <> ''
           ORDER BY m.is_primary DESC, t.id
           LIMIT 1
         ) AS coa_receipt,
         ap.status AS period_status
  FROM invoices i
  LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
  LEFT JOIN accounting_periods ap
    ON ap.periode_tahun = EXTRACT(YEAR FROM COALESCE(i.paid_at, i.created_at))::int
   AND ap.periode_bulan = EXTRACT(MONTH FROM COALESCE(i.paid_at, i.created_at))::int
  WHERE i.status = 'PAID' AND i.fins_synced_at IS NULL AND i.fins_trans_id IS NULL
`;

function reasonOf(row: any) {
  const nominal = Number(row.base_amount || row.total_amount || 0);
  if (!row.coa_receipt || !row.fins_coa_debet) return 'unmapped';
  if (row.coa_receipt === row.fins_coa_debet) return 'unmapped';
  if (!(nominal > 0)) return 'unmapped';
  if (row.period_status && row.period_status !== 'open') return 'closed';
  return 'ready';
}

export async function GET(req: Request) {
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const res = await query(PAID_SQL);
    const buckets = { ready: 0, unmapped: 0, closed: 0 };
    const samples: { invoice_code: string; reason: string }[] = [];
    for (const row of res.rows) {
      const reason = reasonOf(row);
      buckets[reason] += 1;
      if (reason !== 'ready' && samples.length < 20) {
        samples.push({
          invoice_code: row.invoice_code,
          reason: reason === 'closed' ? 'Periode tertutup' : 'Kampanye atau metode bayar belum punya COA',
        });
      }
    }
    return NextResponse.json({ ...buckets, total: res.rows.length, samples });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const res = await query(`${PAID_SQL} ORDER BY i.created_at ASC LIMIT $1`, [parsed.data.limit]);
    const nik = actorCode(session.user?.name);
    let posted = 0;
    let skipped = 0;
    const errors: { invoice_code: string; reason: string }[] = [];

    for (const row of res.rows) {
      const reason = reasonOf(row);
      if (reason !== 'ready') {
        skipped += 1;
        if (errors.length < 20) {
          errors.push({
            invoice_code: row.invoice_code,
            reason: reason === 'closed' ? 'Periode tertutup' : 'COA kampanye atau bank belum dipetakan',
          });
        }
        continue;
      }
      try {
        const nominal = Number(Number(row.base_amount) > 0 ? row.base_amount : row.total_amount);
        const didPost = await withTransaction(async (client) => {
          const locked = await client.query(
            `SELECT id, created_at, fins_trans_id, fins_synced_at FROM invoices WHERE id = $1 AND created_at = $2 FOR UPDATE`,
            [row.id, row.created_at]
          );
          if (locked.rowCount === 0 || locked.rows[0].fins_synced_at || locked.rows[0].fins_trans_id) return false;
          const existing = await client.query(
            `SELECT id FROM fins_trans WHERE id_transaksi = $1 LIMIT 1`,
            [String(row.invoice_code).slice(0, 30)]
          );
          const linked = existing.rows[0]
            ? { id: Number(existing.rows[0].id) }
            : await postBalancedEntry(client, {
              tanggal: String(row.tgl).slice(0, 10),
              nominal,
              coaDebet: row.fins_coa_debet,
              coaKredit: row.coa_receipt,
              keterangan: `Penerimaan ${row.invoice_code} ${row.donor_name_snapshot || ''}`.trim(),
              idTransaksi: row.invoice_code,
              idExre: row.invoice_code,
              noresi: String(row.invoice_code).replace(/\W/g, '').slice(-16),
              nikInput: nik,
              jenis: 'r',
              mutasi: '2',
              note: `invoice:${row.id}`,
            });
          await client.query(
            `UPDATE invoices SET fins_trans_id = $1, fins_synced_at = NOW() WHERE id = $2 AND created_at = $3`,
            [linked.id, row.id, row.created_at]
          );
          return true;
        });
        if (didPost) posted += 1;
      } catch (error: any) {
        skipped += 1;
        if (errors.length < 20) {
          errors.push({ invoice_code: row.invoice_code, reason: error instanceof JournalError ? error.message : (error.message || 'Gagal menjurnal') });
        }
      }
    }

    if (posted > 0) await invalidateCache(['api:crm:fins-sync', 'invoices']);
    return NextResponse.json({ posted, skipped, errors });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
