"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDateTime } from '@/lib/wib-date';

type Row = {
  id: number;
  invoice_code: string;
  donor_id: number | null;
  donor_name_snapshot: string;
  base_amount: string | number;
  paid_at: string | null;
  campaign_title: string;
};

export default function BuktiSetorPage() {
  const [search, setSearch] = useState('');
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const { data, error } = useSWR<{ rows: Row[] }>(`/api/crm/bukti-setor?search=${encodeURIComponent(search)}&tahun=${tahun}`, jsonFetcher);

  const issue = async (donorId: number) => {
    try {
      await sendJson('/api/crm/bukti-setor/sertifikat', 'POST', { donor_id: donorId, tahun: Number(tahun) });
      window.open(`/cetak/sertifikat/${donorId}/${tahun}`, '_blank');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menerbitkan sertifikat');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Bukti Setor" description="Cetak bukti per invoice lunas, atau terbitkan sertifikat tahunan per donatur." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input aria-label="Cari" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kode invoice atau nama" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" />
        <input aria-label="Tahun" value={tahun} onChange={(e) => setTahun(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-400"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Donatur</th><th className="px-4 py-3">Lunas</th><th className="px-4 py-3">Program</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Aksi</th></tr></thead>
          <tbody>
            {(data?.rows ?? []).map((row) => (
              <tr key={`${row.id}`} className="border-t border-slate-50">
                <td className="px-4 py-3 font-medium">{row.invoice_code}</td>
                <td className="px-4 py-3">{row.donor_name_snapshot}</td>
                <td className="px-4 py-3">{formatWibDateTime(row.paid_at)}</td>
                <td className="px-4 py-3">{row.campaign_title || '—'}</td>
                <td className="px-4 py-3 text-right">{formatIDR(Number(row.base_amount || 0))}</td>
                <td className="px-4 py-3">
                  <a className="mr-3 text-teal-700" href={`/cetak/bukti-setor/${encodeURIComponent(row.invoice_code)}`} target="_blank">Cetak</a>
                  {row.donor_id && <button type="button" className="text-slate-600" onClick={() => issue(row.donor_id as number)}>Sertifikat {tahun}</button>}
                </td>
              </tr>
            ))}
            {!data?.rows?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada invoice lunas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
