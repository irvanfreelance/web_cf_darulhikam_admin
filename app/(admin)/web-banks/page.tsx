"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Building, Plus, Search, Edit2, Trash2, Save, Loader2, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from '@/components/ui/file-upload';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BanksPage() {
  const [search, setSearch] = useState('');
  const { data: banks, error, mutate, isLoading } = useSWR(`/api/web-banks?search=${search}`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: 'LAZ Darul Hikam',
    bank_code: '',
    logo_url: '',
    is_active: true,
    display_order: 0,
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      bank_name: '',
      account_number: '',
      account_name: 'LAZ Darul Hikam',
      bank_code: '',
      logo_url: '',
      is_active: true,
      display_order: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      bank_name: item.bank_name || '',
      account_number: item.account_number || '',
      account_name: item.account_name || 'LAZ Darul Hikam',
      bank_code: item.bank_code || '',
      logo_url: item.logo_url || '',
      is_active: item.is_active ?? true,
      display_order: item.display_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-banks';
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
        alert(err.error || 'Gagal menyimpan data rekening bank');
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus rekening bank ini?')) return;
    try {
      const res = await fetch(`/api/web-banks?id=${id}`, { method: 'DELETE' });
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
        title="Rekening Resmi Organisasi" 
        description="Kelola daftar nomor rekening bank resmi untuk transfer donasi, zakat, infaq, dan wakaf"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Rekening
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari nama bank, nomor rekening..." 
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
        ) : banks?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Nama Bank</th>
                  <th className="px-6 py-4">Nomor Rekening</th>
                  <th className="px-6 py-4">Atas Nama</th>
                  <th className="px-6 py-4">Kode Bank</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banks.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.logo_url ? (
                          <div className="w-10 h-10 rounded-xl p-1 bg-white border border-slate-100 shadow-sm shrink-0 flex items-center justify-center">
                            <img src={item.logo_url} alt={item.bank_name} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                            <Building size={20} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.bank_name}</p>
                          <p className="text-xs text-slate-400 font-mono">Order: #{item.display_order}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-800 tracking-wider">
                      {item.account_number}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {item.account_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {item.bank_code || '-'}
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
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada rekening bank.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
        description="Isi detail informasi nomor rekening bank resmi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank *</label>
            <Input 
              required
              placeholder="Contoh: Bank Syariah Indonesia (BSI)"
              value={formData.bank_name}
              onChange={e => setFormData({...formData, bank_name: e.target.value})}
              className="text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening *</label>
              <Input 
                required
                placeholder="Contoh: 7119000000"
                value={formData.account_number}
                onChange={e => setFormData({...formData, account_number: e.target.value})}
                className="text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama *</label>
              <Input 
                required
                placeholder="Contoh: LAZ Darul Hikam"
                value={formData.account_name}
                onChange={e => setFormData({...formData, account_name: e.target.value})}
                className="text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kode Bank Transfer</label>
              <Input 
                placeholder="451"
                value={formData.bank_code}
                onChange={e => setFormData({...formData, bank_code: e.target.value})}
                className="text-slate-900 font-mono"
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
              label="Logo Bank (PNG/SVG Transparan)"
              value={formData.logo_url}
              onChange={(url) => setFormData({...formData, logo_url: url})}
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
