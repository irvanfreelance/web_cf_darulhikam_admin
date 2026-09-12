"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Edit2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatNumber, parseNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const fmtRp = (n: number | string | null) => n === null || n === undefined
  ? 'Tak Terbatas'
  : `Rp ${new Intl.NumberFormat('id-ID').format(Number(n))}`;

type Row = {
  jabatan_id: number; jabatan: string; id: number | null;
  expend_min: string | null; expend_max: string | null;
  receipt_min: string | null; receipt_max: string | null;
  aktif: boolean | null; is_configured: boolean;
};

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

export default function LevelApprovePage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, mutate, isLoading } = useSWR<Row[]>(`/api/fins/level-approve?status=${statusFilter}`, fetcher);
  const rows = data || [];

  const [editingItem, setEditingItem] = useState<Row | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    expend_min: '0', expend_max: '', expend_unlimited: false,
    receipt_min: '0', receipt_max: '', receipt_unlimited: false,
    aktif: true,
  });

  const handleOpenEdit = (item: Row) => {
    setEditingItem(item);
    setFormData({
      expend_min: item.expend_min || '0',
      expend_max: item.expend_max || '',
      expend_unlimited: item.is_configured && item.expend_max === null,
      receipt_min: item.receipt_min || '0',
      receipt_max: item.receipt_max || '',
      receipt_unlimited: item.is_configured && item.receipt_max === null,
      aktif: item.aktif ?? true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/fins/level-approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jabatan: editingItem.jabatan,
          expend_min: parseNumber(formData.expend_min),
          expend_max: formData.expend_unlimited ? null : parseNumber(formData.expend_max),
          receipt_min: parseNumber(formData.receipt_min),
          receipt_max: formData.receipt_unlimited ? null : parseNumber(formData.receipt_max),
          aktif: formData.aktif,
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        mutate();
        toast.success('Level approve tersimpan');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Level Approve"
        description="Batas nominal & jenjang approval transaksi keuangan per jabatan"
      />

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
        <option value="all">Status: Semua</option>
        <option value="configured">Status: Sudah diatur</option>
        <option value="unconfigured">Status: Belum diatur</option>
      </select>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">Jabatan</th>
                <th className="px-6 py-4 border-b border-slate-100">Expend Level</th>
                <th className="px-6 py-4 border-b border-slate-100">Receipt Level</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="h-16 px-6 py-4"></td></tr>)
              ) : rows.length > 0 ? (
                rows.map(item => (
                  <tr key={item.jabatan_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.jabatan}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.is_configured ? `Rp ${new Intl.NumberFormat('id-ID').format(Number(item.expend_min))} s/d ${fmtRp(item.expend_max)}` : '–'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.is_configured ? `Rp ${new Intl.NumberFormat('id-ID').format(Number(item.receipt_min))} s/d ${fmtRp(item.receipt_max)}` : '–'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.is_configured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                        {item.is_configured ? 'Sudah diatur' : 'Belum diatur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data jabatan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Level Approve Jabatan"
      >
        {editingItem && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan</label>
              <input value={editingItem.jabatan} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Expend Level (batas pengeluaran)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Min</span>
                  <Input
                    inputMode="numeric"
                    value={formatNumber(formData.expend_min)}
                    onChange={e => setFormData({ ...formData, expend_min: String(parseNumber(e.target.value)) })}
                    className="text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Max</span>
                  <Input
                    inputMode="numeric"
                    disabled={formData.expend_unlimited}
                    value={formData.expend_unlimited ? '' : formatNumber(formData.expend_max)}
                    placeholder={formData.expend_unlimited ? 'Tak Terbatas' : ''}
                    onChange={e => setFormData({ ...formData, expend_max: String(parseNumber(e.target.value)) })}
                    className="text-slate-900 font-mono disabled:bg-slate-50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={formData.expend_unlimited} onChange={e => setFormData({ ...formData, expend_unlimited: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                <span className="text-xs text-slate-500">Tidak terbatas (tanpa batas maksimum)</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Receipt Level (batas penerimaan)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Min</span>
                  <Input
                    inputMode="numeric"
                    value={formatNumber(formData.receipt_min)}
                    onChange={e => setFormData({ ...formData, receipt_min: String(parseNumber(e.target.value)) })}
                    className="text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Max</span>
                  <Input
                    inputMode="numeric"
                    disabled={formData.receipt_unlimited}
                    value={formData.receipt_unlimited ? '' : formatNumber(formData.receipt_max)}
                    placeholder={formData.receipt_unlimited ? 'Tak Terbatas' : ''}
                    onChange={e => setFormData({ ...formData, receipt_max: String(parseNumber(e.target.value)) })}
                    className="text-slate-900 font-mono disabled:bg-slate-50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={formData.receipt_unlimited} onChange={e => setFormData({ ...formData, receipt_unlimited: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                <span className="text-xs text-slate-500">Tidak terbatas (tanpa batas maksimum)</span>
              </label>
            </div>

            <Toggle checked={formData.aktif} onChange={v => setFormData({ ...formData, aktif: v })} label="Aktif" />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
