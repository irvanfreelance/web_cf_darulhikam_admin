import { query } from '@/lib/db';
import { PrintButton } from '@/components/shared/print-button';
import { formatIDR } from '@/lib/format';
import { formatWibDateTime } from '@/lib/wib-date';

export default async function CetakBuktiPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [invoiceRes, orgRes] = await Promise.all([
    query(
      `SELECT i.invoice_code, i.donor_name_snapshot, i.donor_email, i.base_amount, i.admin_fee, i.total_amount, i.paid_at,
              COALESCE(string_agg(DISTINCT c.title, ', '), '-') AS campaign_title
       FROM invoices i
       LEFT JOIN transactions t ON t.invoice_id = i.id AND t.invoice_created_at = i.created_at
       LEFT JOIN campaigns c ON c.id = t.campaign_id
       WHERE i.invoice_code = $1 AND i.status = 'PAID'
       GROUP BY i.id, i.created_at
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [decodeURIComponent(code)]
    ),
    query(`SELECT ngo_name, address FROM ngo_configs LIMIT 1`),
  ]);
  const invoice = invoiceRes.rows[0];
  const org = orgRes.rows[0];
  if (!invoice) return <p>Bukti setor tidak ditemukan.</p>;

  return (
    <article className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Bukti setor</p>
          <h1 className="text-2xl font-semibold">{org?.ngo_name || 'LAZ Darul Hikam'}</h1>
          <p className="text-sm text-slate-500">{org?.address || ''}</p>
        </div>
        <PrintButton />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Nomor</dt><dd className="font-medium">{invoice.invoice_code}</dd></div>
        <div><dt className="text-slate-500">Tanggal lunas</dt><dd>{formatWibDateTime(invoice.paid_at, '-')}</dd></div>
        <div><dt className="text-slate-500">Donatur</dt><dd>{invoice.donor_name_snapshot}</dd></div>
        <div><dt className="text-slate-500">Email</dt><dd>{invoice.donor_email || '-'}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Program</dt><dd>{invoice.campaign_title}</dd></div>
        <div><dt className="text-slate-500">Donasi</dt><dd>{formatIDR(Number(invoice.base_amount || 0))}</dd></div>
        <div><dt className="text-slate-500">Total dibayar</dt><dd>{formatIDR(Number(invoice.total_amount || 0))}</dd></div>
      </dl>
      <p className="text-sm text-slate-600">Bukti ini menyatakan donasi telah berstatus lunas. Bukan pengganti jurnal keuangan.</p>
    </article>
  );
}
