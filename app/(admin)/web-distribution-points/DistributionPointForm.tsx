"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';

const MapPointPicker = dynamic(() => import('@/components/admin/map-point-picker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] rounded-xl bg-slate-100 animate-pulse flex items-center justify-center">
      <span className="text-slate-400 font-medium text-sm">Memuat Peta...</span>
    </div>
  ),
});

export default function DistributionPointForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'province',
    latitude: initialData ? Number(initialData.latitude) : -0.789275,
    longitude: initialData ? Number(initialData.longitude) : 113.921327,
    description: initialData?.description || '',
    display_order: initialData?.display_order ?? 0,
    is_active: initialData?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = '/api/web-distribution-points';
      const method = initialData ? 'PATCH' : 'POST';
      const body = initialData ? { id: initialData.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push('/web-distribution-points');
      } else {
        const err = await res.json();
        alert(JSON.stringify(err.error || err.errors));
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <PageHeader
        title={initialData ? 'Edit Titik Sebaran' : 'Tambah Titik Sebaran'}
        description="Klik pada peta untuk menandai lokasi penyaluran."
      >
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" /> Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            {initialData ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </div>
      </PageHeader>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Nama Lokasi *</label>
            <Input
              required
              className="text-slate-900 font-medium"
              placeholder="Contoh: Jawa Barat"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Tipe</label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="province">Provinsi</option>
              <option value="city">Kota</option>
              <option value="country">Negara</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">Deskripsi (Opsional)</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Catatan singkat tentang titik penyaluran ini"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Urutan Tampil</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Tampilkan di Peta (Aktif)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <label className="block text-xs font-bold text-slate-500 mb-3">Lokasi di Peta *</label>
        <MapPointPicker
          lat={formData.latitude}
          lng={formData.longitude}
          onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
        />
      </div>
    </form>
  );
}
