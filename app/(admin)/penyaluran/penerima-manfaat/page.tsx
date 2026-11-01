"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Edit, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';
import type { Beneficiary } from '@/types/penyaluran';

type ListResponse = { rows: Beneficiary[]; total: number };

function coord(value: string | number | null) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(5) : '—';
}

export default function BeneficiariesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [kategori, setKategori] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ search, status, kategori, limit: String(limit), offset: String(offset) });
  const { data, error, isLoading } = useSWR<ListResponse>(`/api/penyaluran/beneficiaries?${params.toString()}`, jsonFetcher);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Penerima Manfaat" description="Master penerima, termasuk koordinat dan status verifikasi">
        <Link href="/penyaluran/penerima-manfaat/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white">
          <Plus size={16} /> Tambah
        </Link>
      </PageHeader>

      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Cari penerima"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nama, NIK, kode, atau kabupaten"
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select aria-label="Status verifikasi" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua status</option>
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select aria-label="Kategori" value={kategori} onChange={(e) => { setKategori(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua kategori</option>
          <option value="individu">Individu</option>
          <option value="keluarga">Keluarga</option>
          <option value="komunitas">Komunitas</option>
          <option value="lembaga">Lembaga</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Wilayah</th>
                <th className="px-4 py-3 font-medium">Koordinat</th>
                <th className="px-4 py-3 font-medium">Verifikasi</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Daftar tidak dapat dimuat.</td></tr>
              ) : data?.rows?.length ? data.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{row.kode_beneficiary}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{row.nama_lengkap}</div>
                    <div className="text-xs text-slate-400">{row.nik || 'Tanpa NIK'}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{row.kategori}</td>
                  <td className="px-4 py-3 text-slate-600">{row.kabupaten || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{coord(row.latitude)}, {coord(row.longitude)}</td>
                  <td className="px-4 py-3">
                    <span className={row.status_verifikasi === 'verified' ? 'text-emerald-600' : row.status_verifikasi === 'rejected' ? 'text-rose-600' : 'text-slate-500'}>
                      {row.status_verifikasi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/penyaluran/penerima-manfaat/${row.id}`} className="inline-flex p-2 text-slate-400 hover:text-teal-600" aria-label={`Ubah ${row.nama_lengkap}`}>
                      <Edit size={16} />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum ada penerima manfaat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          offset={offset}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next) => { setLimit(next); setPage(1); }}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
