"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDate } from '@/lib/wib-date';

type Routine = { id: number; donor_name: string; nominal: string | number; cadence: string; next_due: string | null; aktif: boolean; due_state: string; catatan: string | null };
type Donor = { id: number; name: string };

export default function RoutinesPage() {
  const { data, error, mutate } = useSWR<Routine[]>('/api/crm/routines', jsonFetcher);
  const [donorSearch, setDonorSearch] = useState('');
  const donorUrl = donorSearch
    ? `/api/crm/donors?search=${encodeURIComponent(donorSearch)}&limit=20`
    : '/api/crm/donors?limit=20';
  const { data: donors } = useSWR<{ rows: Donor[] }>(donorUrl, jsonFetcher);
  const [form, setForm] = useState({ donor_id: '', nominal: '', cadence: 'monthly', next_due: '', catatan: '' });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await sendJson('/api/crm/routines', 'POST', {
        ...form,
        donor_id: Number(form.donor_id),
        nominal: Number(form.nominal),
        next_due: form.next_due || undefined,
        catatan: form.catatan || null,
      });
      toast.success('Jadwal rutin tersimpan');
      setForm({ donor_id: '', nominal: '', cadence: 'monthly', next_due: '', catatan: '' });
      await mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan jadwal');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Jadwal rutin" description="Komitmen donasi berulang. LPS menampilkan yang jatuh tempo." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <form onSubmit={save} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-2">
        <input aria-label="Cari donatur" value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)} placeholder="Cari nama donatur" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select aria-label="Donatur" required value={form.donor_id} onChange={(e) => setForm({ ...form, donor_id: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">Pilih donatur</option>
          {(donors?.rows ?? []).map((donor) => <option key={donor.id} value={donor.id}>{donor.name}</option>)}
        </select>
        <input aria-label="Nominal" required value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} placeholder="Nominal" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select aria-label="Irama" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="weekly">Mingguan</option>
          <option value="monthly">Bulanan</option>
          <option value="yearly">Tahunan</option>
        </select>
        <input aria-label="Jatuh tempo" type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input aria-label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
        <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm text-white">Simpan jadwal</button>
      </form>
      <ul className="divide-y rounded-2xl border border-slate-100 bg-white">
        {(Array.isArray(data) ? data : []).map((row) => (
          <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{row.donor_name || 'Donatur'}</div>
              <div className="text-slate-500">{row.cadence} · {formatIDR(Number(row.nominal || 0))} · jatuh tempo {formatWibDate(row.next_due) || '—'}</div>
              {row.catatan && <div className="text-xs text-slate-400">{row.catatan}</div>}
            </div>
            <span className={row.due_state === 'overdue' ? 'text-rose-600' : 'text-slate-400'}>{row.due_state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
