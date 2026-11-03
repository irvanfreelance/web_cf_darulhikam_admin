"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, Edit2, Trash2, Save, Loader2, RefreshCw, X } from 'lucide-react';
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
      <span className={cn('w-10 h-6 rounded-full transition-colors relative shrink-0', checked ? 'bg-teal-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

/**
 * Komponen Multi-COA Selector dengan Dropdown Pencarian & Inline List
 */
function CoaMultiSelect({
  label,
  value,
  onChange,
  allCoas,
  prefixFilter,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  allCoas: Array<{ coa: string; nama_coa: string }>;
  prefixFilter?: string; // misalnya '5' untuk beban/expense, '4' untuk penerimaan/revenue
}) {
  const [selectedCoa, setSelectedCoa] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pisahkan kode terpilih menjadi array
  const currentItems = value
    ? value.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  const handleAdd = (codeToAdd: string) => {
    if (!codeToAdd) return;
    if (currentItems.includes(codeToAdd)) {
      toast.info(`COA ${codeToAdd} sudah ada dalam daftar`);
      return;
    }
    const updated = [...currentItems, codeToAdd];
    onChange(updated.join(','));
    setSelectedCoa('');
  };

  const handleRemove = (codeToRemove: string) => {
    const updated = currentItems.filter(c => c !== codeToRemove);
    onChange(updated.join(','));
  };

  // Filter pilihan dropdown
  const filteredOptions = allCoas.filter(c => {
    if (prefixFilter && !c.coa.startsWith(prefixFilter)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return c.coa.toLowerCase().includes(term) || c.nama_coa.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">{label}</label>
        <span className="text-[11px] text-slate-400 font-medium">
          {currentItems.length} akun dipilih
        </span>
      </div>

      {/* Selector Dropdown & Tombol Tambah */}
      <div className="flex gap-2">
        <div className="flex-1">
          <select
            value={selectedCoa}
            onChange={e => {
              const val = e.target.value;
              setSelectedCoa(val);
              if (val) handleAdd(val);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
          >
            <option value="">-- Pilih Akun COA untuk Ditambahkan --</option>
            {filteredOptions.map(c => {
              const isSelected = currentItems.includes(c.coa);
              return (
                <option key={c.coa} value={c.coa} disabled={isSelected}>
                  {c.coa} — {stripTags(c.nama_coa)} {isSelected ? '(Sudah dipilih)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Inline Table / Card List COA Terpilih */}
      {currentItems.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
          <table className="min-w-full text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-mono w-32">Kode COA</th>
                <th className="px-3 py-2 text-left">Nama Akun Perkiraan</th>
                <th className="px-3 py-2 text-center w-16">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentItems.map(code => {
                const matched = allCoas.find(c => c.coa === code);
                return (
                  <tr key={code} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {code}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {matched ? stripTags(matched.nama_coa) : '-'}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(code)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus akun dari mapping"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Belum ada akun yang dipilih. Gunakan dropdown di atas untuk menambahkan.
        </div>
      )}
    </div>
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
  const coaNameMap: Record<string, string> = data?.coaNameMap || {};
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Ambil daftar seluruh akun COA untuk dropdown
  const { data: coaData } = useSWR('/api/fins/coa?limit=500', fetcher);
  const allCoasList: Array<{ coa: string; nama_coa: string; level?: number }> = coaData?.rows || [];

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

  const lookupCoa = (coa: string) => {
    if (!coa) { setFormCoaNama(null); return; }
    const match = allCoasList.find(r => r.coa === coa);
    if (match) {
      setFormCoaNama({ nama_coa: stripTags(match.nama_coa), level: Number(match.level || 2) });
    } else {
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
        toast.error('Gagal menghapus beberapa data');
      }
    } catch {
      toast.error('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper untuk merender daftar kode COA dengan nama artinya di tabel
  const renderCoaBadges = (coaString: string) => {
    if (!coaString) return <span className="text-slate-400 italic">Tidak ada</span>;
    const list = coaString.split(',').map(c => c.trim()).filter(Boolean);
    if (list.length === 0) return <span className="text-slate-400 italic">Tidak ada</span>;

    return (
      <div className="flex flex-wrap gap-1.5">
        {list.map(c => {
          const name = coaNameMap[c] || allCoasList.find(x => x.coa === c)?.nama_coa;
          return (
            <span
              key={c}
              title={name ? `${c} - ${name}` : c}
              className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-2 py-0.5 text-[11px] font-mono text-slate-700 transition-colors"
            >
              <span className="font-semibold text-slate-800">{c}</span>
              {name && (
                <span className="font-sans font-normal text-slate-500 max-w-[150px] truncate">
                  ({stripTags(name)})
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo Dana"
        description="Mapping akun (COA) ke akun beban/penerimaan untuk perhitungan saldo dana per kategori"
      >
        <Button onClick={handleOpenCreate} className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white">
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
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
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
            className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500">
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
                      <td className="px-6 py-4 text-xs max-w-sm">
                        {renderCoaBadges(item.coa_expend)}
                      </td>
                      <td className="px-6 py-4 text-xs max-w-sm">
                        {renderCoaBadges(item.coa_receipt)}
                      </td>
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
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit mapping">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeletingItem(item)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus mapping">
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">COA Dana</label>
              {editingItem ? (
                <Input
                  disabled
                  value={formData.coa_dana}
                  className="text-slate-900 font-mono bg-slate-50 disabled:text-slate-500 font-semibold"
                />
              ) : (
                <select
                  required
                  value={formData.coa_dana}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, coa_dana: val });
                    lookupCoa(val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="">-- Pilih COA Dana (Kelompok 3) --</option>
                  {allCoasList.filter(c => c.coa.startsWith('3')).map(c => (
                    <option key={c.coa} value={c.coa}>
                      {c.coa} — {stripTags(c.nama_coa)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama COA</label>
              <Input readOnly value={formCoaNama?.nama_coa || ''} className="text-slate-600 bg-slate-50" />
            </div>
          </div>

          {/* Selector Dropdown & Inline Table COA Expense */}
          <CoaMultiSelect
            label="COA Expense (Beban / Pengeluaran)"
            value={formData.coa_expend}
            onChange={val => setFormData({ ...formData, coa_expend: val })}
            allCoas={allCoasList}
            prefixFilter="5"
          />

          {/* Selector Dropdown & Inline Table COA Revenue */}
          <CoaMultiSelect
            label="COA Revenue (Penerimaan / Donasi)"
            value={formData.coa_receipt}
            onChange={val => setFormData({ ...formData, coa_receipt: val })}
            allCoas={allCoasList}
            prefixFilter="4"
          />

          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
              <Input
                readOnly
                value={formCoaNama ? `Level ${formCoaNama.level}${formCoaNama.level === 1 ? ' (Header Kategori)' : ''}` : '-'}
                className="text-slate-500 bg-slate-50 text-xs"
              />
            </div>
            <Toggle checked={formData.ops === 'y'} onChange={v => setFormData({ ...formData, ops: v ? 'y' : 'n' })} label="Operasional" />
          </div>

          <Toggle checked={formData.active === 'y'} onChange={v => setFormData({ ...formData, active: v ? 'y' : 'n' })} label="Status Aktif" />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
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
