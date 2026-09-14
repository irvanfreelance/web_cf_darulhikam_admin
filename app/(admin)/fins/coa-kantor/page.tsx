"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Edit2, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const stripTags = (s: string) => (s || '').replace(/<\/?[^>]+>/g, '');

type MappingRow = {
  id: number; id_kantor: number; kantor_nama: string;
  coa_cash: string; coa_cash_nama: string;
  coa_non_cash: string; coa_non_cash_nama: string;
};

const emptyForm = () => ({ id_kantor: '' as number | '', coa_cash: '', coa_non_cash: '' });

export default function CoaKantorPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);
  const { data: rows, mutate, isLoading } = useSWR<MappingRow[]>('/api/fins/coa-kantor', fetcher);

  const list = rows || [];

  const duplicateCashCoas = new Set<string>();
  {
    const counts = new Map<string, number>();
    for (const r of list) counts.set(r.coa_cash, (counts.get(r.coa_cash) || 0) + 1);
    for (const [coa, count] of counts) if (count > 1) duplicateCashCoas.add(coa);
  }
  const hasDuplicates = duplicateCashCoas.size > 0;

  const coaOptions = (masters?.coaAccounts || []).map((c: { coa: string; nama_coa: string }) => ({ id: c.coa, name: `${c.coa} — ${stripTags(c.nama_coa)}` }));
  const officeOptions = (masters?.offices || []).map((o: { id: number; nama: string }) => ({ id: o.id, name: o.nama }));
  const mappedKantorIds = new Set(list.map(r => r.id_kantor));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MappingRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<MappingRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MappingRow) => {
    setEditingItem(item);
    setFormData({ id_kantor: item.id_kantor, coa_cash: item.coa_cash, coa_non_cash: item.coa_non_cash });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_kantor) { toast.error('Pilih Kantor terlebih dahulu'); return; }
    if (!formData.coa_cash) { toast.error('Pilih COA Cash terlebih dahulu'); return; }
    if (!formData.coa_non_cash) { toast.error('Pilih COA Non Cash terlebih dahulu'); return; }
    setIsSubmitting(true);
    try {
      const url = '/api/fins/coa-kantor';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem
        ? { id: editingItem.id, coa_cash: formData.coa_cash, coa_non_cash: formData.coa_non_cash }
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
      const res = await fetch(`/api/fins/coa-kantor?id=${deletingItem.id}`, { method: 'DELETE' });
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

  const availableOfficeOptions = officeOptions.filter((o: { id: number }) => !mappedKantorIds.has(o.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="COA Kantor"
        description="Pemetaan akun kas & non kas (COA) untuk setiap kantor/cabang"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Mapping
        </Button>
      </PageHeader>

      {hasDuplicates && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
          <AlertTriangle size={18} className="shrink-0" />
          Terdapat COA Cash yang dipakai lebih dari satu kantor — periksa baris yang ditandai merah.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">Kantor</th>
                <th className="px-6 py-4 border-b border-slate-100">COA Cash</th>
                <th className="px-6 py-4 border-b border-slate-100">Nama COA Cash</th>
                <th className="px-6 py-4 border-b border-slate-100">COA Non Cash</th>
                <th className="px-6 py-4 border-b border-slate-100">Nama COA Non Cash</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(3)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 px-6 py-4"></td></tr>)
              ) : list.length > 0 ? (
                list.map(item => {
                  const flagged = duplicateCashCoas.has(item.coa_cash);
                  return (
                    <tr key={item.id} className={cn('transition-colors', flagged ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50/50')}>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.kantor_nama}</td>
                      <td className={cn('px-6 py-4 font-mono font-bold', flagged ? 'text-rose-600' : 'text-slate-800')}>{item.coa_cash}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{stripTags(item.coa_cash_nama) || '-'}</td>
                      <td className="px-6 py-4 font-mono text-slate-800">{item.coa_non_cash}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{stripTags(item.coa_non_cash_nama) || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeletingItem(item)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada mapping COA kantor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Mapping COA Kantor' : 'Tambah Mapping COA Kantor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kantor</label>
            {editingItem ? (
              <input value={editingItem.kantor_nama} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-500" />
            ) : (
              <SearchableSelect
                options={availableOfficeOptions}
                value={formData.id_kantor}
                onChange={val => setFormData({ ...formData, id_kantor: Number(val) })}
                placeholder="Pilih Kantor"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Cash</label>
            <SearchableSelect options={coaOptions} value={formData.coa_cash} onChange={val => setFormData({ ...formData, coa_cash: String(val) })} placeholder="Cari..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Non Cash</label>
            <SearchableSelect options={coaOptions} value={formData.coa_non_cash} onChange={val => setFormData({ ...formData, coa_non_cash: String(val) })} placeholder="Cari..." />
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
        title="Hapus Mapping COA Kantor"
        description={`Apakah Anda yakin ingin menghapus mapping untuk "${deletingItem?.kantor_nama}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
