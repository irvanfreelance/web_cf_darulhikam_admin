"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { MapPin, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DistributionPointsPage() {
  const [search, setSearch] = useState('');
  const { data: points, mutate } = useSWR(`/api/web-distribution-points?search=${search}`, fetcher);

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus titik sebaran ini?')) return;
    try {
      const res = await fetch(`/api/web-distribution-points?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        alert('Gagal menghapus titik sebaran');
      }
    } catch (e) {
      alert('Terjadi kesalahan saat menghapus titik sebaran');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Titik Sebaran Penyaluran"
        description="Kelola titik lokasi yang ditampilkan pada peta sebaran penyaluran"
      >
        <Link href="/web-distribution-points/new">
          <Button className="shrink-0">
            <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Titik
          </Button>
        </Link>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Cari nama lokasi..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {!points ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>)}
          </div>
        ) : points.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Lokasi</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4">Koordinat</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point: any) => (
                  <tr key={point.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <MapPin size={16} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{point.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium capitalize">
                      {point.type === 'country' ? 'Negara' : point.type === 'city' ? 'Kota' : 'Provinsi'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {Number(point.latitude).toFixed(4)}, {Number(point.longitude).toFixed(4)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase
                        ${point.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {point.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/web-distribution-points/${point.id}`}>
                        <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                      </Link>
                      <button onClick={() => handleDelete(point.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada titik sebaran ditemukan.</div>
        )}
      </div>
    </div>
  );
}
