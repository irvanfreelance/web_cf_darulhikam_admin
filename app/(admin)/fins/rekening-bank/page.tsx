"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { Plus, Search, Edit2, Trash2, Save, Loader2, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const LIMIT = 10;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2"
    >
      <span
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative shrink-0',
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

const emptyForm = () => ({
  id_rekening: '',
  id_bank: '',
  keterangan: '',
  coa: '',
  scrap: 'n' as 'y' | 'n',
  active: 'y' as 'y' | 'n',
  note: '',
});

export default function RekeningBankPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [search, setSearch] = useState('');
  const [scrapFilter, setScrapFilter] = useState('all');
  const [coaFilter, setCoaFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    search, scrap: scrapFilter, coa: coaFilter, active: activeFilter,
    page: String(page), limit: String(LIMIT),
  });
  const { data, mutate, isLoading } = useSWR(`/api/fins/rekening-bank?${queryParams.toString()}`, fetcher);
  const rows = data?.rows || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const bankOptions = (masters?.banks || []).map((b: { id_bank: string; bank: string }) => ({ id: b.id_bank, name: `${b.bank} (${b.id_bank})` }));
  const coaOptions = (masters?.coaAccounts || []).map((c: { coa: string; nama_coa: string }) => ({ id: c.coa, name: `${c.coa} — ${c.nama_coa}` }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      id_rekening: item.id_rekening || '',
      id_bank: item.id_bank || '',
      keterangan: item.keterangan || '',
      coa: item.coa || '',
      scrap: item.scrap || 'n',
      active: item.active || 'y',
      note: item.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_bank) { alert('Pilih Bank terlebih dahulu'); return; }
    if (!formData.coa) { alert('Pilih COA Kas/Bank terlebih dahulu'); return; }
    setIsSubmitting(true);
    try {
      const url = '/api/fins/rekening-bank';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem
        ? { id_rekening: editingItem.id_rekening, id_bank: formData.id_bank, keterangan: formData.keterangan, coa: formData.coa, scrap: formData.scrap, active: formData.active, note: formData.note }
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
      const res = await fetch(`/api/fins/rekening-bank?id_rekening=${encodeURIComponent(deletingItem.id_rekening)}`, { method: 'DELETE' });
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
      const params = new URLSearchParams({ search, scrap: scrapFilter, coa: coaFilter, active: activeFilter, page: '1', limit: '1000' });
      const res = await fetch(`/api/fins/rekening-bank?${params.toString()}`);
      const exportData = await res.json();
      const worksheet = XLSX.utils.json_to_sheet((exportData.rows || []).map((item: any) => ({
        'Bank': item.bank,
        'No. Rekening': item.id_rekening,
        'Description': item.keterangan,
        'COA': item.coa,
        'Nama COA': item.nama_coa || '',
        'Scrap': item.scrap === 'y' ? 'Ya' : 'Tidak',
        'Status': item.active === 'y' ? 'Aktif' : 'Non Aktif',
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekening Bank');
      XLSX.writeFile(workbook, `Export_Rekening_Bank_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Gagal export data');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekening Bank"
        description="Master rekening bank organisasi beserta mapping COA kas/bank & status keaktifan"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Rekening
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Cari bank, no rekening, description..."
                className="pl-10 text-slate-900"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select value={scrapFilter} onChange={e => { setScrapFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
              <option value="all">Scrap: Semua</option>
              <option value="y">Scrap: Ya</option>
              <option value="n">Scrap: Tidak</option>
            </select>
            <select value={coaFilter} onChange={e => { setCoaFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 max-w-[220px]">
              <option value="all">COA: Semua</option>
              {(masters?.coaAccounts || []).map((c: { coa: string; nama_coa: string }) => (
                <option key={c.coa} value={c.coa}>{c.coa} — {c.nama_coa}</option>
              ))}
            </select>
            <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
              <option value="all">Status: Semua</option>
              <option value="y">Status: Aktif</option>
              <option value="n">Status: Non Aktif</option>
            </select>
          </div>
          <Button variant="outline" onClick={handleExport} className="shrink-0">
            <Download size={16} className="mr-2" /> Export
          </Button>
        </div>

        <DataTable
          columns={[
            {
              header: 'Bank',
              cell: (item: any) => (
                <span className={cn('font-semibold', item.active === 'y' ? 'text-slate-800' : 'text-slate-400')}>{item.bank}</span>
              ),
            },
            {
              header: 'No. Rekening',
              cell: (item: any) => (
                <span className={cn('font-mono', item.active === 'y' ? 'text-slate-800' : 'text-slate-400')}>{item.id_rekening}</span>
              ),
            },
            {
              header: 'Description',
              cell: (item: any) => (
                <span className={cn('text-sm', item.active === 'y' ? 'text-slate-600' : 'text-slate-400')}>{item.keterangan || '-'}</span>
              ),
            },
            {
              header: 'COA',
              cell: (item: any) => (
                <div>
                  <div className={cn('font-mono text-xs', item.active === 'y' ? 'text-slate-700' : 'text-slate-400')}>{item.coa}</div>
                  {item.nama_coa && <div className="text-[11px] text-slate-400">{item.nama_coa}</div>}
                </div>
              ),
            },
            {
              header: 'Scrap',
              align: 'center',
              cell: (item: any) => (
                <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.scrap === 'y' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600')}>
                  {item.scrap === 'y' ? 'Ya' : 'Tidak'}
                </span>
              ),
            },
            {
              header: 'Status',
              align: 'center',
              cell: (item: any) => (
                <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.active === 'y' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                  {item.active === 'y' ? 'Aktif' : 'Non Aktif'}
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
          emptyMessage="Belum ada data rekening bank."
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
        title={editingItem ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
        description="Isi detail rekening bank organisasi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank *</label>
              <SearchableSelect options={bankOptions} value={formData.id_bank} onChange={val => setFormData({ ...formData, id_bank: String(val) })} placeholder="Pilih Bank" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No. Rekening *</label>
              <Input
                required
                disabled={!!editingItem}
                placeholder="cth. 2450123456"
                value={formData.id_rekening}
                onChange={e => setFormData({ ...formData, id_rekening: e.target.value })}
                className="text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <Input
              placeholder="Deskripsi rekening"
              value={formData.keterangan}
              onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
              className="text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Kas/Bank *</label>
            <SearchableSelect options={coaOptions} value={formData.coa} onChange={val => setFormData({ ...formData, coa: String(val) })} placeholder="Cari..." />
          </div>

          <div className="flex items-center gap-8 pt-2">
            <Toggle checked={formData.scrap === 'y'} onChange={v => setFormData({ ...formData, scrap: v ? 'y' : 'n' })} label="Scrap (mutasi otomatis)" />
            <Toggle checked={formData.active === 'y'} onChange={v => setFormData({ ...formData, active: v ? 'y' : 'n' })} label="Status Aktif" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
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

      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Rekening Bank"
        description={`Apakah Anda yakin ingin menghapus rekening "${deletingItem?.id_rekening}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
