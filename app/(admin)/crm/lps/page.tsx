"use client";

import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDate } from '@/lib/wib-date';

type Routine = { id: number; donor_name: string; nominal: string | number; cadence: string; next_due: string | null; due_state: string };

export default function LpsPage() {
  const { data, error, mutate } = useSWR<Routine[]>('/api/crm/routines?due=1', jsonFetcher);

  const advance = async (id: number) => {
    try {
      await sendJson(`/api/crm/routines/${id}`, 'PATCH', { action: 'advance' });
      toast.success('Jatuh tempo digeser satu periode');
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menggeser jatuh tempo');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="LPS rutin" description="Jadwal aktif yang jatuh tempo hari ini, terlambat, atau dalam 7 hari." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-400"><tr><th className="px-4 py-3">Donatur</th><th className="px-4 py-3">Irama</th><th className="px-4 py-3">Jatuh tempo</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Aksi</th></tr></thead>
          <tbody>
            {(Array.isArray(data) ? data : []).map((row) => (
              <tr key={row.id} className="border-t border-slate-50">
                <td className="px-4 py-3 font-medium">{row.donor_name || '—'}</td>
                <td className="px-4 py-3">{row.cadence}</td>
                <td className={`px-4 py-3 ${row.due_state === 'overdue' ? 'text-rose-600' : 'text-amber-700'}`}>{formatWibDate(row.next_due) || '—'} · {row.due_state === 'overdue' ? 'terlambat' : 'jatuh tempo'}</td>
                <td className="px-4 py-3 text-right">{formatIDR(Number(row.nominal || 0))}</td>
                <td className="px-4 py-3"><button type="button" className="text-teal-700" onClick={() => advance(row.id)}>Tandai periode ini</button></td>
              </tr>
            ))}
            {Array.isArray(data) && data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada jadwal jatuh tempo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
