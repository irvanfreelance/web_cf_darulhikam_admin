"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { MessageSquare, Plus, Search, Edit2, Trash2, Save, Loader2, User } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from '@/components/ui/file-upload';
import Image from 'next/image';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TestimonialsPage() {
  const [search, setSearch] = useState('');
  const { data: testimonials, error, mutate, isLoading } = useSWR(`/api/web-testimonials?search=${search}`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    person_name: '',
    person_role: '',
    person_type: 'muzakki',
    quote: '',
    avatar_url: '',
    is_active: true,
    display_order: 0,
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      person_name: '',
      person_role: '',
      person_type: 'muzakki',
      quote: '',
      avatar_url: '',
      is_active: true,
      display_order: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      person_name: item.person_name || '',
      person_role: item.person_role || '',
      person_type: item.person_type || 'muzakki',
      quote: item.quote || '',
      avatar_url: item.avatar_url || '',
      is_active: item.is_active ?? true,
      display_order: item.display_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-testimonials';
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
        alert(err.error || 'Gagal menyimpan data testimoni');
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus testimoni ini?')) return;
    try {
      const res = await fetch(`/api/web-testimonials?id=${id}`, { method: 'DELETE' });
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
        title="Manajemen Testimoni" 
        description="Kelola kutipan testimoni dari Donatur (Muzakki) dan Penerima Manfaat (Mustahiq)"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Testimoni
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari nama atau kutipan..." 
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
        ) : testimonials?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Tokoh / Orang</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4 max-w-md">Kutipan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testimonials.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.avatar_url ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative bg-slate-100 border border-slate-200">
                            <img src={item.avatar_url} alt={item.person_name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.initials || item.person_name?.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.person_name}</p>
                          <p className="text-xs text-slate-500">{item.person_role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${item.person_type === 'muzakki' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-teal-50 text-teal-600 border border-teal-100'}`}>
                        {item.person_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 line-clamp-2 max-w-md italic">
                      "{item.quote}"
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
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada testimoni.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Testimoni' : 'Tambah Testimoni Baru'}
        description="Isi detail informasi testimoni"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Tokoh *</label>
            <Input 
              required
              placeholder="Contoh: Ahmad Rizaldi"
              value={formData.person_name}
              onChange={e => setFormData({...formData, person_name: e.target.value})}
              className="text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan / Profesi / Lokasi *</label>
              <Input 
                required
                placeholder="Contoh: Pengusaha, Jakarta"
                value={formData.person_role}
                onChange={e => setFormData({...formData, person_role: e.target.value})}
                className="text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Testimoni *</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.person_type}
                onChange={e => setFormData({...formData, person_type: e.target.value})}
              >
                <option value="muzakki">Muzakki / Donatur</option>
                <option value="mustahiq">Mustahiq / Penerima</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kutipan Testimoni *</label>
            <textarea 
              required
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Tulis testimoni di sini..."
              value={formData.quote}
              onChange={e => setFormData({...formData, quote: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Tampilan</label>
              <Input 
                type="number"
                value={formData.display_order}
                onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                className="text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Active</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.is_active ? '1' : '0'}
                onChange={e => setFormData({...formData, is_active: e.target.value === '1'})}
              >
                <option value="1">Aktif</option>
                <option value="0">Non-Aktif</option>
              </select>
            </div>
          </div>

          <div>
            <FileUpload 
              label="Foto Avatar / Profile (Opsional)"
              value={formData.avatar_url}
              onChange={(url) => setFormData({...formData, avatar_url: url})}
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
