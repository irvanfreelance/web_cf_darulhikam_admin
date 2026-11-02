"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';
import type { Beneficiary } from '@/types/penyaluran';

export default function VerifikasiListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('unverified');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ search, status, limit: String(limit), offset: String(offset) });
  const { data, error, isLoading } = useSWR<{ rows: Beneficiary[]; total: number }>(`/api/penyaluran/beneficiaries?${params.toString()}`, jsonFetcher);
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Verifikasi penerima manfaat" description="Alur status unverified, verified, atau rejected beserta catatan pemeriksa." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="Cari penerima" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm" placeholder="Nama, NIK, kode, kabupaten" />
        </div>
        <select aria-label="Status verifikasi" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="unverified">Menunggu</option>
          <option value="verified">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="all">Semua</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Penerima</th>
              <th className="px-4 py-3 font-medium">Wilayah</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              : error ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Daftar tidak dapat dimuat.</td></tr>
              : data?.rows?.length ? data.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.nama_lengkap}</div>
                    <div className="text-xs text-slate-400">{row.kode_beneficiary}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.kabupaten || '—'}</td>
                  <td className="px-4 py-3">{row.status_verifikasi}</td>
                  <td className="px-4 py-3">
                    <a href={`/penyaluran/verifikasi/${row.id}`} className="text-sm font-medium text-teal-700 hover:underline">Periksa</a>
                  </td>
                </tr>
              )) : <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Tidak ada penerima pada filter ini.</td></tr>}
          </tbody>
        </table>
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / limit))} totalCount={total} offset={offset} limit={limit} onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(1); }} isLoading={isLoading} />
      </div>
    </div>
  );
}
