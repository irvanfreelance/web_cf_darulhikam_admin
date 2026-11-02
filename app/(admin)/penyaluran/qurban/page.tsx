"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';

type Row = {
  id: number;
  nama_shohibul: string;
  atas_nama: string | null;
  kontak_shohibul: string | null;
  niat: string | null;
  urutan_peserta: number;
  invoice_id: number | null;
  created_at: string;
  kode_hewan: string | null;
  jenis_hewan: string | null;
  status_hewan: string | null;
  campaign_title: string | null;
};

export default function QurbanListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) });
  const { data, error, isLoading } = useSWR<{ rows: Row[]; total: number }>(`/api/penyaluran/qurban?${params.toString()}`, jsonFetcher);
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="List Qurban" description="Peserta dari qurban_shahibul, berikut hewan dan kampanye bila ada." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <div className="relative rounded-2xl border border-slate-100 bg-white p-4">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
        <input aria-label="Cari peserta qurban" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nama shohibul, atas nama, atau kode hewan" className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Shohibul</th>
                <th className="px-4 py-3 font-medium">Atas nama</th>
                <th className="px-4 py-3 font-medium">Hewan</th>
                <th className="px-4 py-3 font-medium">Kampanye</th>
                <th className="px-4 py-3 font-medium">Urutan</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
                : error ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Daftar tidak dapat dimuat.</td></tr>
                : data?.rows?.length ? data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{row.nama_shohibul}</div>
                      <div className="text-xs text-slate-400">{row.kontak_shohibul || row.niat || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.atas_nama || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.kode_hewan ? `${row.kode_hewan} · ${row.jenis_hewan} · ${row.status_hewan}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.campaign_title || '—'}</td>
                    <td className="px-4 py-3">{row.urutan_peserta}</td>
                    <td className="px-4 py-3">{row.invoice_id || '—'}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada peserta qurban.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / limit))} totalCount={total} offset={offset} limit={limit} onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(1); }} isLoading={isLoading} />
      </div>
    </div>
  );
}
