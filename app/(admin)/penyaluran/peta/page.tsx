"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import type { PetaPoint } from '@/components/admin/penyaluran-map';

const PenyaluranMap = dynamic(() => import('@/components/admin/penyaluran-map'), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">Memuat peta...</div>,
});

export default function PetaPenyaluranPage() {
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useSWR<PetaPoint[]>(`/api/penyaluran/peta?search=${encodeURIComponent(search)}`, jsonFetcher);
  const points = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Peta Penyaluran" description="Penerima manfaat yang punya koordinat, beserta pengajuan terakhir. Ubin OpenStreetMap." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <input aria-label="Cari titik" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama, kode, atau kabupaten" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" />
      {isLoading ? <div className="h-[520px] animate-pulse rounded-2xl bg-slate-100" /> : points.length ? <div className="overflow-hidden rounded-2xl border border-slate-100"><PenyaluranMap points={points} /></div> : <p className="text-sm text-slate-400">Belum ada penerima dengan koordinat.</p>}
      <p className="text-xs text-slate-400">{points.length} titik. Hijau tua = disalurkan, hijau = disetujui, amber = diajukan.</p>
    </div>
  );
}
