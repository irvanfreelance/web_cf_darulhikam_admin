"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { Hash, Plus, Search, Edit2, Trash2, Save, Loader2, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const LIMIT = 10;

export default function KodeBankPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, mutate, isLoading } = useSWR(
    `/api/fins/kode-bank?search=${search}&page=${page}&limit=${LIMIT}`,
    fetcher
  );
  const rows = data?.rows || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    id_bank: '',
    bank: '',
    description_code: '',
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ id_bank: '', bank: '', description_code: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      id_bank: item.id_bank || '',
      bank: item.bank || '',
      description_code: item.description_code || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/fins/kode-bank';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem
        ? { id_bank: editingItem.id_bank, bank: formData.bank, description_code: formData.description_code }
        : formData;

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
        alert(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fins/kode-bank?id_bank=${encodeURIComponent(deletingItem.id_bank)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingItem(null);
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus data');
      }
    } catch (err) {
      alert('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/fins/kode-bank?search=${search}&page=1&limit=1000`);
      const exportData = await res.json();
      const worksheet = XLSX.utils.json_to_sheet((exportData.rows || []).map((item: any) => ({
        'Kode': item.id_bank,
        'Bank': item.bank,
        'Description Code': item.description_code,
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kode Bank');
      XLSX.writeFile(workbook, `Export_Kode_Bank_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Gagal export data');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kode Bank"
        description="Master data kode bank untuk keperluan mutasi dan transfer"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> New
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Cari kode, nama bank..."
              className="pl-10 text-slate-900"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button variant="outline" onClick={handleExport} className="shrink-0">
            <Download size={16} className="mr-2" /> Export
          </Button>
        </div>

        <DataTable
          columns={[
            {
              header: 'Kode',
              cell: (item: any) => <span className="font-mono font-bold text-slate-800">{item.id_bank}</span>,
            },
            {
              header: 'Bank',
              cell: (item: any) => <span className="font-semibold text-slate-800">{item.bank}</span>,
            },
            {
              header: 'Description Code',
              cell: (item: any) => (
                <span className="text-slate-500 text-xs truncate block max-w-md" title={item.description_code}>
                  {item.description_code || '-'}
                </span>
              ),
            },
            {
              header: 'Aksi',
              align: 'right',
              cell: (item: any) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setDeletingItem(item)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={rows}
          isLoading={isLoading}
          emptyMessage="Belum ada data kode bank."
          className="rounded-none border-0 shadow-none"
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          offset={(page - 1) * LIMIT}
          limit={LIMIT}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Kode Bank' : 'Add Kode Bank'}
        description="Isi detail kode bank untuk master data mutasi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kode Bank *</label>
            <Input
              required
              disabled={!!editingItem}
              maxLength={5}
              placeholder="Kode Bank"
              value={formData.id_bank}
              onChange={e => setFormData({ ...formData, id_bank: e.target.value.toUpperCase() })}
              className="text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank *</label>
            <Input
              required
              placeholder="Nama Bank"
              value={formData.bank}
              onChange={e => setFormData({ ...formData, bank: e.target.value })}
              className="text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description Code</label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Description Code1|Description Code2|Description Code3"
              value={formData.description_code}
              onChange={e => setFormData({ ...formData, description_code: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Kode Bank"
        description={`Apakah Anda yakin ingin menghapus kode bank "${deletingItem?.id_bank}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
