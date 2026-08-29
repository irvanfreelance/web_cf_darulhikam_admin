"use client";

import React, { useState, useRef } from 'react';
import useSWR from 'swr';
import { upload } from '@vercel/blob/client';
import {
  Plus, Search, Edit2, Trash2, Save, Loader2,
  GraduationCap, HandCoins, Leaf, HeartPulse, Users, MoonStar, Heart,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Fallback icons for the 6 categories seeded before icon upload — shown only
// until the admin picks/uploads a custom icon_url for that category.
const FALLBACK_ICONS: Record<string, React.ComponentType<any>> = {
  'Peduli Pendidikan': GraduationCap,
  'Peduli Lingkungan': Leaf,
  'Peduli Umat': Users,
  'Peduli Kesehatan': HeartPulse,
  'Peduli Ekonomi': HandCoins,
  'Program Khusus': MoonStar,
};

function CategoryIcon({ item, className }: { item: any; className?: string }) {
  if (item.icon_url) {
    return <img src={item.icon_url} alt={item.label} className={className} />;
  }
  const Icon = FALLBACK_ICONS[item.label] || Heart;
  return <Icon className={className} />;
}

export default function ImpactCategoriesPage() {
  const [search, setSearch] = useState('');
  const { data: categories, mutate, isLoading } = useSWR(`/api/web-impact-categories?search=${search}`, fetcher);
  const { data: iconLibrary, mutate: mutateIcons } = useSWR('/api/web-icon-library', fetcher);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emptyForm = {
    icon_url: '',
    label: '',
    value: 0,
    suffix: '',
    display_order: 0,
    is_active: true,
  };
  const [formData, setFormData] = useState(emptyForm);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      icon_url: item.icon_url || '',
      label: item.label || '',
      value: item.value ? parseFloat(item.value) : 0,
      suffix: item.suffix || '',
      display_order: item.display_order ?? 0,
      is_active: item.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-impact-categories';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem ? { id: editingItem.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan kategori');
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingIcon(true);
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      const res = await fetch('/api/web-icon-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, label: file.name.replace(/\.[^.]+$/, '') }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan ikon');
      const newIcon = await res.json();
      await mutateIcons();
      setFormData(prev => ({ ...prev, icon_url: newIcon.url }));
    } catch (err) {
      alert('Gagal mengupload ikon');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      const res = await fetch(`/api/web-impact-categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus data');
      }
    } catch (e) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jejak Kebaikan"
        description="Kelola kartu kategori (Peduli Pendidikan, Peduli Lingkungan, dll) beserta angka penerima manfaat yang tampil di panel bawah Peta Sebaran"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Kategori
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Cari nama kategori..."
              className="pl-10 text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>)}
          </div>
        ) : categories?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Kategori</th>
                  <th className="px-6 py-4">Angka</th>
                  <th className="px-6 py-4">Suffix</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#76b541] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-2">
                          <CategoryIcon item={item} className={item.icon_url ? "w-full h-full object-contain" : "text-white w-6 h-6"} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 font-mono">Order: #{item.display_order}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base font-extrabold text-teal-600 font-mono">
                      {Number(item.value).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">
                      {item.suffix || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {item.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada kategori.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        description="Kartu ini tampil di panel 'Jejak Kebaikan' pada Peta Sebaran"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori *</label>
            <Input
              required
              placeholder="Contoh: Peduli Lingkungan"
              value={formData.label}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
              className="text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Ikon Kategori</label>
            <div className="grid grid-cols-8 gap-2">
              {(iconLibrary || []).map((icon: any) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.label || 'Ikon'}
                  onClick={() => setFormData({ ...formData, icon_url: icon.url })}
                  className={cn(
                    "aspect-square rounded-xl bg-[#76b541] p-2 flex items-center justify-center transition-all overflow-hidden",
                    formData.icon_url === icon.url
                      ? "ring-2 ring-offset-2 ring-slate-800"
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={icon.url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                disabled={isUploadingIcon}
                title="Upload ikon baru"
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-[#76b541] hover:text-[#76b541] transition-all disabled:opacity-50"
              >
                {isUploadingIcon ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
              <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Klik &ldquo;+&rdquo; untuk upload ikon baru (PNG, latar transparan disarankan) — sekali upload bisa dipakai ulang di kategori lain. Jika tidak dipilih, ikon default akan dipakai.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Angka Penerima Manfaat *</label>
              <Input
                type="number"
                step="any"
                required
                placeholder="8983"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Suffix (Opsional, misal: +, rb+)</label>
              <Input
                placeholder=""
                value={formData.suffix}
                onChange={e => setFormData({ ...formData, suffix: e.target.value })}
                className="text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Tampilan</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Active</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.is_active ? '1' : '0'}
                onChange={e => setFormData({ ...formData, is_active: e.target.value === '1' })}
              >
                <option value="1">Aktif</option>
                <option value="0">Non-Aktif</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
