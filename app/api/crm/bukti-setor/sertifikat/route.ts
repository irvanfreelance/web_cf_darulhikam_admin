import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';

const bodySchema = z.object({
  donor_id: z.coerce.number().int().positive(),
  tahun: z.coerce.number().int().min(2000).max(2100),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = await parseBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const donor = await query('SELECT id, name, email FROM donors WHERE id = $1', [parsed.data.donor_id]);
    if (donor.rowCount === 0) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });
    const totals = await query(
      `SELECT COALESCE(SUM(t.amount), 0)::bigint AS total,
              COALESCE(SUM(t.amount) FILTER (WHERE c.is_zakat IS TRUE), 0)::bigint AS zakat,
              COALESCE(SUM(t.amount) FILTER (WHERE c.is_qurban IS TRUE), 0)::bigint AS qurban,
              COALESCE(SUM(t.amount) FILTER (WHERE c.is_zakat IS NOT TRUE AND c.is_qurban IS NOT TRUE), 0)::bigint AS lainnya,
              COUNT(DISTINCT i.id)::int AS jumlah,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT t.campaign_id), NULL) AS campaign_ids
       FROM invoices i
       JOIN transactions t ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
       JOIN campaigns c ON c.id = t.campaign_id
       WHERE i.donor_id = $1 AND i.status = 'PAID'
         AND EXTRACT(YEAR FROM COALESCE(i.paid_at, i.created_at))::int = $2`,
      [parsed.data.donor_id, parsed.data.tahun]
    );
    const row = totals.rows[0];
    if (!row || Number(row.total) <= 0) return NextResponse.json({ error: 'Tidak ada donasi lunas pada tahun itu' }, { status: 400 });

    const seq = await query(
      `SELECT COUNT(*)::int AS n FROM donation_certificates WHERE tahun_donasi = $1`,
      [parsed.data.tahun]
    );
    const nomor = `SERT-${parsed.data.tahun}-${String(Number(seq.rows[0].n) + 1).padStart(6, '0')}`;
    const saved = await query(
      `INSERT INTO donation_certificates (
         nomor_sertifikat, donor_id, nama_donatur, email_donatur, tahun_donasi,
         total_donasi, total_zakat, total_infaq, total_qurban, total_lainnya,
         jumlah_transaksi, campaign_ids, issued_by, sent_via
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,$11,$12,'manual')
       ON CONFLICT (donor_id, tahun_donasi) DO UPDATE SET
         total_donasi = EXCLUDED.total_donasi,
         total_zakat = EXCLUDED.total_zakat,
         total_qurban = EXCLUDED.total_qurban,
         total_lainnya = EXCLUDED.total_lainnya,
         jumlah_transaksi = EXCLUDED.jumlah_transaksi,
         campaign_ids = EXCLUDED.campaign_ids,
         issued_by = EXCLUDED.issued_by
       RETURNING *`,
      [
        nomor, donor.rows[0].id, donor.rows[0].name, donor.rows[0].email, parsed.data.tahun,
        row.total, row.zakat, row.qurban, row.lainnya, row.jumlah, row.campaign_ids, actorCode(session.user?.name),
      ]
    );
    const org = await query(`SELECT ngo_name, address FROM ngo_configs LIMIT 1`);
    return NextResponse.json({ certificate: saved.rows[0], org: org.rows[0] || { ngo_name: 'LAZ Darul Hikam' } });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
