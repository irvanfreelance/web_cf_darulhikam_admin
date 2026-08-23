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
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Fallback icons for categories seeded before icon upload existed — shown
// only until the admin uploads a custom icon_url for that category.
const FALLBACK_ICONS: Record<string, React.ComponentType<any>> = {
  GraduationCap, HandCoins, Leaf, HeartPulse, Users, MoonStar, Heart,
};

function CategoryIcon({ item, className }: { item: any; className?: string }) {
  if (item.icon_url) {
    return <img src={item.icon_url} alt={item.label} className={className} />;
  }
  const Icon = FALLBACK_ICONS[item.icon_name] || Heart;
  return <Icon className={className} />;
}

export default function CareCategoriesPage() {
  const [search, setSearch] = useState('');
  const { data: categories, mutate, isLoading } = useSWR(`/api/web-care-categories?search=${search}`, fetcher);
  const { data: iconLibrary, mutate: mutateIcons } = useSWR('/api/web-icon-library', fetcher);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emptyForm = {
    icon_name: 'Heart',
    icon_url: '',
    label: '',
    quote_text: '',
    quote_source: '',
    description: '',
    photo_url: '',
    is_active: true,
    display_order: 0,
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
      icon_name: item.icon_name || 'Heart',
      icon_url: item.icon_url || '',
      label: item.label || '',
      quote_text: item.quote_text || '',
      quote_source: item.quote_source || '',
      description: item.description || '',
      photo_url: item.photo_url || '',
      is_active: item.is_active ?? true,
      display_order: item.display_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-care-categories';
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
      const res = await fetch(`/api/web-care-categories?id=${id}`, { method: 'DELETE' });
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
        title="Program Peduli"
        description="Kelola kategori program (Peduli Pendidikan, Peduli Lingkungan, dll) beserta isi popup detail yang tampil saat ikonnya diklik di website"
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
                  <th className="px-6 py-4">Kutipan / Dalil</th>
                  <th className="px-6 py-4">Foto</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#83b64e] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-2">
                          <CategoryIcon item={item} className={item.icon_url ? "w-full h-full object-contain" : "text-white w-6 h-6"} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 font-mono">Order: #{item.display_order}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs">
                      {item.quote_text ? (
                        <>
                          <p className="italic line-clamp-2">&ldquo;{item.quote_text}&rdquo;</p>
                          {item.quote_source && <p className="text-slate-400 font-semibold mt-0.5">{item.quote_source}</p>}
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {item.photo_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={item.photo_url} alt={item.label} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium italic">Belum ada</span>
                      )}
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
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada kategori program.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        description="Kategori ini tampil sebagai ikon di beranda website; klik ikonnya akan membuka popup berisi kutipan, deskripsi, dan foto di bawah ini"
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
            <label className="block text-xs font-bold text-slate-700 mb-2">Ikon Kategori *</label>
            <div className="grid grid-cols-8 gap-2">
              {(iconLibrary || []).map((icon: any) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.label || 'Ikon'}
                  onClick={() => setFormData({ ...formData, icon_url: icon.url })}
                  className={cn(
                    "aspect-square rounded-xl border-2 p-1.5 flex items-center justify-center transition-all overflow-hidden",
                    formData.icon_url === icon.url
                      ? "border-[#83b64e] bg-[#83b64e]/10"
                      : "border-slate-200 hover:border-slate-300"
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
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-[#83b64e] hover:text-[#83b64e] transition-all disabled:opacity-50"
              >
                {isUploadingIcon ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
              <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Klik &ldquo;+&rdquo; untuk upload ikon baru (PNG, latar transparan disarankan) — sekali upload bisa dipakai ulang di kategori lain.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kutipan / Dalil (Opsional)</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder='Contoh: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya."'
              value={formData.quote_text}
              onChange={e => setFormData({ ...formData, quote_text: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sumber Kutipan (Opsional)</label>
            <Input
              placeholder="Contoh: HR. Ahmad"
              value={formData.quote_source}
              onChange={e => setFormData({ ...formData, quote_source: e.target.value })}
              className="text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Program (Opsional)</label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Jelaskan program ini secara singkat..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 mt-1">Tip: apit teks dengan **teks** untuk membuatnya <strong>tebal</strong> di popup website.</p>
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

          <div>
            <FileUpload
              label="Foto Program (tampil di popup)"
              value={formData.photo_url}
              onChange={(url) => setFormData({ ...formData, photo_url: url })}
            />
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
