"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, Edit2, Trash2, Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Pagination } from '@/components/shared/pagination';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const LIMIT = 10;

const stripTags = (s: string) => (s || '').replace(/<\/?[^>]+>/g, '');

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2">
      <span className={cn('w-10 h-6 rounded-full transition-colors relative shrink-0', checked ? 'bg-indigo-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

const emptyForm = () => ({
  coa_dana: '',
  coa_expend: '',
  coa_receipt: '',
  ops: 'n' as 'y' | 'n',
  active: 'y' as 'y' | 'n',
});

export default function SaldoDanaPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({ search, active: activeFilter, page: String(page), limit: String(LIMIT) });
  const { data, mutate, isLoading } = useSWR(`/api/fins/saldo-dana?${queryParams.toString()}`, fetcher);
  const rows = data?.rows || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = rows.length > 0 && rows.every((r: any) => selected.has(r.coa_dana));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r: any) => r.coa_dana)));
  };
  const toggleOne = (coaDana: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(coaDana)) next.delete(coaDana); else next.add(coaDana);
      return next;
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [formCoaNama, setFormCoaNama] = useState<{ nama_coa: string; level: number } | null>(null);

  const commitSearch = () => { setSearch(searchDraft); setPage(1); };

  const lookupCoa = async (coa: string) => {
    if (!coa) { setFormCoaNama(null); return; }
    try {
      const res = await fetch(`/api/fins/coa?search=${encodeURIComponent(coa)}&page=1&limit=1`);
      const json = await res.json();
      const match = (json.rows || []).find((r: any) => r.coa === coa);
      setFormCoaNama(match ? { nama_coa: stripTags(match.nama_coa), level: Number(match.level) } : null);
    } catch {
      setFormCoaNama(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setFormCoaNama(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      coa_dana: item.coa_dana || '',
      coa_expend: item.coa_expend || '',
      coa_receipt: item.coa_receipt || '',
      ops: item.ops || 'n',
      active: item.active || 'y',
    });
    setFormCoaNama(item.nama_coa ? { nama_coa: stripTags(item.nama_coa), level: Number(item.level) } : null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/fins/saldo-dana';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem
        ? { coa_dana: editingItem.coa_dana, coa_expend: formData.coa_expend, coa_receipt: formData.coa_receipt, ops: formData.ops, active: formData.active }
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
        toast.error(typeof err.error === 'string' ? err.error : 'Gagal menyimpan data');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fins/saldo-dana?coa_dana=${encodeURIComponent(deletingItem.coa_dana)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingItem(null);
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus data');
      }
    } catch (err) {
      toast.error('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fins/saldo-dana?coa_dana_list=${Array.from(selected).map(encodeURIComponent).join(',')}`, { method: 'DELETE' });
      if (res.ok) {
        setSelected(new Set());
        setIsBulkDeleteOpen(false);
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus data');
      }
    } catch (err) {
      toast.error('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo Dana"
        description="Mapping akun (COA) ke akun beban/penerimaan untuk perhitungan saldo dana per kategori"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Mapping
        </Button>
      </PageHeader>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Keyword..." value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <button onClick={commitSearch} className="px-5 py-2.5 rounded-xl border border-slate-100 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          Search
        </button>
        <button
          onClick={() => selected.size > 0 && setIsBulkDeleteOpen(true)}
          disabled={selected.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} /> Delete
        </button>
        <button onClick={() => mutate()} className="p-2.5 rounded-xl border border-slate-100 bg-white text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw size={16} />
        </button>

        <div className="ml-auto">
          <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
            <option value="all">Status: Semua</option>
            <option value="y">Status: Aktif</option>
            <option value="n">Status: Non Aktif</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100 w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="px-6 py-4 border-b border-slate-100">COA</th>
                <th className="px-6 py-4 border-b border-slate-100">Nama COA</th>
                <th className="px-6 py-4 border-b border-slate-100">COA Expense</th>
                <th className="px-6 py-4 border-b border-slate-100">COA Revenue</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Operasional</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={8} className="h-16 px-6 py-4"></td></tr>)
              ) : rows.length > 0 ? (
                rows.map((item: any) => {
                  const isHeader = item.parent === 'y';
                  return (
                    <tr key={item.coa_dana} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={selected.has(item.coa_dana)} onChange={() => toggleOne(item.coa_dana)} className="w-4 h-4 rounded border-slate-300" />
                      </td>
                      <td className={cn('px-6 py-4 font-mono text-sm', isHeader ? 'font-bold text-slate-800' : 'text-slate-700')}>{item.coa_dana}</td>
                      <td className={cn('px-6 py-4 text-sm', isHeader ? 'font-bold text-slate-800' : 'text-slate-600')} style={{ paddingLeft: isHeader ? 24 : 40 }}>
                        {stripTags(item.nama_coa) || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600 max-w-xs">{item.coa_expend || '-'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600 max-w-xs">{item.coa_receipt || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.ops === 'y' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600')}>
                          {item.ops === 'y' ? 'Ya' : 'Tidak'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.active === 'y' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                          {item.active === 'y' ? 'Aktif' : 'Non Aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeletingItem(item)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Belum ada mapping saldo dana.</td></tr>
              )}
            </tbody>
          </table>
        </div>

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
        title={editingItem ? 'Edit Mapping Saldo Dana' : 'Tambah Mapping Saldo Dana'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">COA</label>
              <Input
                required
                disabled={!!editingItem}
                placeholder="cth. 301.00.000.000"
                value={formData.coa_dana}
                onChange={e => { setFormData({ ...formData, coa_dana: e.target.value }); }}
                onBlur={e => lookupCoa(e.target.value)}
                className="text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama COA</label>
              <Input readOnly value={formCoaNama?.nama_coa || ''} className="text-slate-500 bg-slate-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Expense</label>
            <Input
              placeholder="Pisahkan dengan koma, cth. 501.00.000.000, 502.01.000.000"
              value={formData.coa_expend}
              onChange={e => setFormData({ ...formData, coa_expend: e.target.value })}
              className="text-slate-900 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Revenue</label>
            <Input
              placeholder="Pisahkan dengan koma, cth. 401.00.000.000, 402.01.000.000"
              value={formData.coa_receipt}
              onChange={e => setFormData({ ...formData, coa_receipt: e.target.value })}
              className="text-slate-900 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
              <Input
                readOnly
                value={formCoaNama ? `Level ${formCoaNama.level}${formCoaNama.level === 1 ? ' (Header Kategori)' : ''}` : '-'}
                className="text-slate-500 bg-slate-50"
              />
            </div>
            <Toggle checked={formData.ops === 'y'} onChange={v => setFormData({ ...formData, ops: v ? 'y' : 'n' })} label="Operasional" />
          </div>

          <Toggle checked={formData.active === 'y'} onChange={v => setFormData({ ...formData, active: v ? 'y' : 'n' })} label="Aktif" />

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
        title="Hapus Mapping Saldo Dana"
        description={`Apakah Anda yakin ingin menghapus mapping "${deletingItem?.coa_dana}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        isLoading={isDeleting}
        title="Hapus Mapping Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selected.size} mapping yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
