"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Shield, Plus, Search, Edit2, Trash2, Save, Loader2, Download, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from '@/components/ui/file-upload';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LegalityPage() {
  const [search, setSearch] = useState('');
  const { data: legality, error, mutate, isLoading } = useSWR(`/api/web-legality?search=${search}`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    document_number: '',
    issued_by: '',
    issued_date: '',
    file_url: '',
    is_active: true,
    display_order: 0,
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      document_number: '',
      issued_by: '',
      issued_date: '',
      file_url: '',
      is_active: true,
      display_order: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      document_number: item.document_number || '',
      issued_by: item.issued_by || '',
      issued_date: item.issued_date ? item.issued_date.substring(0, 10) : '',
      file_url: item.file_url || '',
      is_active: item.is_active ?? true,
      display_order: item.display_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-legality';
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
        alert(err.error || 'Gagal menyimpan data legalitas');
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus dokumen legalitas ini?')) return;
    try {
      const res = await fetch(`/api/web-legality?id=${id}`, { method: 'DELETE' });
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
        title="Dokumen Legalitas & Perizinan" 
        description="Kelola SK Kemenag, Izin LAZ, NPWP, Akta Notaris, dan perizinan resmi lembaga"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Dokumen
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari judul atau nomor dokumen..." 
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
        ) : legality?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Nama Dokumen</th>
                  <th className="px-6 py-4">Nomor SK / Izin</th>
                  <th className="px-6 py-4">Penerbit / Instansi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {legality.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <Shield size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          {item.file_url ? (
                            <a href={item.file_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                              <Download size={12} /> Lihat Berkas
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-semibold text-slate-700">
                      {item.document_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      {item.issued_by || '-'}
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
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada dokumen legalitas.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Dokumen Legalitas' : 'Tambah Dokumen Legalitas'}
        description="Isi detail informasi perizinan dan upload berkas PDF/Gambar"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Dokumen *</label>
            <Input 
              required
              placeholder="Contoh: SK Izin Operasional Kemenag RI"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK / Dokumen</label>
              <Input 
                placeholder="Contoh: SK Nomor 792 Tahun 2020"
                value={formData.document_number}
                onChange={e => setFormData({...formData, document_number: e.target.value})}
                className="text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instansi Penerbit</label>
              <Input 
                placeholder="Contoh: Kementerian Agama RI"
                value={formData.issued_by}
                onChange={e => setFormData({...formData, issued_by: e.target.value})}
                className="text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Terbit</label>
              <Input 
                type="date"
                value={formData.issued_date}
                onChange={e => setFormData({...formData, issued_date: e.target.value})}
                className="text-slate-900"
              />
            </div>
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
              label="Upload Berkas Legalitas (PDF / Gambar)"
              value={formData.file_url}
              onChange={(url) => setFormData({...formData, file_url: url})}
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
