"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type Row = {
  id: number;
  nomor_pengajuan: string;
  judul: string;
  status: string;
  jenis_penyaluran: string;
  jumlah_diajukan: string | number;
  jumlah_disetujui: string | number | null;
  tgl_pengajuan: string;
  campaign_title: string | null;
  beneficiary_nama: string | null;
  kode_beneficiary: string | null;
};

export default function DaftarPenyaluranPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [catatan, setCatatan] = useState('');
  const [approveNote, setApproveNote] = useState<Record<number, string>>({});
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ search, status, limit: String(limit), offset: String(offset) });
  const { data, error, isLoading, mutate } = useSWR<{ rows: Row[]; total: number }>(`/api/penyaluran/requests?${params.toString()}`, jsonFetcher);

  const act = async (id: number, action: 'approve' | 'reject' | 'submit', note?: string) => {
    setBusyId(id);
    try {
      await sendJson(`/api/penyaluran/requests/${id}`, 'PATCH', { action, catatan: note ?? null });
      toast.success(action === 'approve' ? 'Pengajuan disetujui' : action === 'reject' ? 'Pengajuan ditolak' : 'Pengajuan dikirim');
      setRejectId(null);
      setCatatan('');
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="List Penyaluran" description="Setujui atau tolak pengajuan. Persetujuan belum mencairkan dana ke buku.">
        <a href="/penyaluran/pengajuan" className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white">Pengajuan baru</a>
      </PageHeader>
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="Cari pengajuan" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nomor, judul, atau penerima" className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm" />
        </div>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua status</option>
          {['draft', 'submitted', 'approved', 'rejected', 'disbursed', 'cancelled'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nomor</th>
                <th className="px-4 py-3 font-medium">Judul</th>
                <th className="px-4 py-3 font-medium">Penerima</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
                : error ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Daftar tidak dapat dimuat.</td></tr>
                : data?.rows?.length ? data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50 align-top">
                    <td className="px-4 py-3">
                      <a href={`/penyaluran/daftar/${row.id}`} className="font-medium text-teal-700 hover:underline">{row.nomor_pengajuan}</a>
                      <div className="text-xs text-slate-400">{String(row.tgl_pengajuan).slice(0, 10)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{row.judul}</td>
                    <td className="px-4 py-3 text-slate-600">{row.beneficiary_nama || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.campaign_title || '—'}</td>
                    <td className="px-4 py-3 text-right">{formatIDR(Number(row.jumlah_diajukan || 0))}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {['submitted', 'reviewed'].includes(row.status) && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              aria-label={`Catatan persetujuan ${row.nomor_pengajuan}`}
                              value={approveNote[row.id] ?? ''}
                              onChange={(e) => setApproveNote((current) => ({ ...current, [row.id]: e.target.value }))}
                              placeholder="Catatan opsional"
                              className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                            <button type="button" disabled={busyId === row.id} onClick={() => act(row.id, 'approve', approveNote[row.id])} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60">Setujui</button>
                          </div>
                        )}
                        {row.status === 'approved' && (
                          <a href={`/penyaluran/entry?request=${row.id}`} className="rounded-lg border border-teal-200 px-2 py-1 text-xs text-teal-700">Catat penyaluran</a>
                        )}
                        {['draft', 'submitted', 'reviewed'].includes(row.status) && (
                          <button type="button" onClick={() => { setRejectId(row.id); setCatatan(''); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs text-white">Tolak</button>
                        )}
                        {['draft', 'rejected'].includes(row.status) && (
                          <button type="button" disabled={busyId === row.id} onClick={() => act(row.id, 'submit')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">Ajukan</button>
                        )}
                      </div>
                      {rejectId === row.id && (
                        <div className="mt-2 space-y-2">
                          <textarea aria-label="Catatan penolakan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="w-56 rounded-lg border border-slate-200 px-2 py-1 text-xs" placeholder="Alasan penolakan" />
                          <div className="flex gap-2">
                            <button type="button" disabled={busyId === row.id} onClick={() => act(row.id, 'reject', catatan)} className="rounded-lg bg-rose-600 px-2 py-1 text-xs text-white">Simpan tolak</button>
                            <button type="button" onClick={() => setRejectId(null)} className="text-xs text-slate-500">Batal</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum ada pengajuan.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / limit))} totalCount={total} offset={offset} limit={limit} onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(1); }} isLoading={isLoading} />
      </div>
    </div>
  );
}
