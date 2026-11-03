"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, CheckCircle2, Loader2, Plus, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type PenerimaanRow = {
  id: number;
  id_trans: string;
  tgl_exre: string;
  coa_debet: string;
  coa_kredit: string;
  nominal: number;
  quantity: number;
  total: number;
  keterangan: string;
  nik_input: string;
  nik_approve: string | null;
  id_kantor: number;
  kantor_nama: string | null;
  approve: string;
  id_program: number;
  program_nama: string | null;
  noresi: string;
};

export default function PenerimaanPage() {
  const [status, setStatus] = useState<'all' | 'draft' | 'approved' | 'rejected'>('all');
  const [periodeFrom, setPeriodeFrom] = useState('');
  const [periodeTo, setPeriodeTo] = useState('');
  const [idKantor, setIdKantor] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    status,
    idKantor,
    keyword,
    limit: String(limit),
    offset: String(offset),
  });
  if (periodeFrom) params.set('periodeFrom', periodeFrom);
  if (periodeTo) params.set('periodeTo', periodeTo);

  const { data, error, isLoading, mutate } = useSWR<{ rows: PenerimaanRow[]; total: number }>(
    `/api/fins/penerimaan?${params.toString()}`,
    jsonFetcher
  );

  const { data: coaList } = useSWR<any[]>('/api/fins/coa', async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    return (json?.rows || json || []).filter((c: any) => c.active === 'y' && c.parent === 'n');
  });

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);
  const { data: programData } = useSWR<any>('/api/fins/program?status=aktif&limit=100', jsonFetcher);
  const programList = programData?.rows || [];

  // Modal Input Penerimaan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    tglExre: new Date().toISOString().slice(0, 10),
    coaDebet: '',
    coaKredit: '',
    nominal: 0,
    quantity: 1,
    keterangan: '',
    idKantor: '' as string | number,
    idProgram: 0,
    mutasi: '1',
    noresi: '',
    saveAndApprove: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.coaDebet || !form.coaKredit) {
      toast.error('Pilih akun debet dan kredit');
      return;
    }
    if (form.coaDebet === form.coaKredit) {
      toast.error('Akun debet dan kredit tidak boleh sama');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fins/penerimaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          idKantor: form.idKantor ? Number(form.idKantor) : null,
          idProgram: Number(form.idProgram) || 0,
          nominal: Number(form.nominal),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan transaksi');
      }

      toast.success(
        form.saveAndApprove
          ? 'Penerimaan berhasil disetujui & jurnal terbit'
          : 'Draf penerimaan berhasil disimpan'
      );
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number, action: 'approve' | 'reject') => {
    try {
      toast.loading(action === 'approve' ? 'Menyetujui penerimaan...' : 'Menolak penerimaan...');
      const res = await fetch(`/api/fins/penerimaan/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memproses transaksi');
      }

      toast.dismiss();
      toast.success(action === 'approve' ? 'Penerimaan disetujui & jurnal terbit' : 'Penerimaan ditolak');
      mutate();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Penerimaan Kas & Bank"
        description="Pencatatan donasi langsung, zakat, infaq, dan pendapatan non-crowdfunding"
      >
        <button
          type="button"
          onClick={() => {
            setForm({
              tglExre: new Date().toISOString().slice(0, 10),
              coaDebet: '',
              coaKredit: '',
              nominal: 0,
              quantity: 1,
              keterangan: '',
              idKantor: '',
              idProgram: 0,
              mutasi: '1',
              noresi: '',
              saveAndApprove: false,
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} /> Input Penerimaan
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draf (Belum Approve)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={periodeFrom}
            onChange={(e) => { setPeriodeFrom(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={periodeTo}
            onChange={(e) => { setPeriodeTo(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kantor</label>
          <select
            value={idKantor}
            onChange={(e) => { setIdKantor(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="all">Semua Kantor</option>
            {(kantorList || []).map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pencarian</label>
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="No Transaksi, Keterangan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3 font-medium text-center">No</th>
                <th className="px-3 py-3 font-medium">Tanggal</th>
                <th className="px-3 py-3 font-medium">ID Transaksi</th>
                <th className="px-3 py-3 font-medium">Akun Debet / Kredit</th>
                <th className="px-4 py-3 font-medium">Keterangan / Program</th>
                <th className="px-3 py-3 font-medium text-right">Nominal</th>
                <th className="px-3 py-3 font-medium text-center">Status</th>
                <th className="px-3 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data penerimaan...
                  </td>
                </tr>
              ) : data?.rows?.length ? (
                data.rows.map((row, idx) => (
                  <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-center text-xs text-slate-500 font-medium">
                      {offset + idx + 1}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {row.tgl_exre ? row.tgl_exre.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800 text-xs whitespace-nowrap">
                      {row.id_trans}
                      {row.noresi && <div className="text-[10px] text-slate-400">Resi: {row.noresi}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="text-emerald-700 font-medium">D: {row.coa_debet}</div>
                      <div className="text-teal-700 font-medium">K: {row.coa_kredit}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <div className="line-clamp-2">{row.keterangan}</div>
                      {row.program_nama && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {row.program_nama}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatIDR(Number(row.total || row.nominal))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.approve === 'a' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <Check size={12} /> Approved
                        </span>
                      ) : row.approve === 'u' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Draft (Menunggu)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {row.approve === 'u' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApprove(row.id, 'approve')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                          >
                            <Check size={12} /> Setujui
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(row.id, 'reject')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium"
                          >
                            <X size={12} /> Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Belum ada transaksi penerimaan pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          offset={offset}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next) => { setLimit(next); setPage(1); }}
          isLoading={isLoading}
        />
      </div>

      {/* Modal Input Penerimaan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Form Penerimaan Kas & Bank</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tglExre}
                    onChange={(e) => setForm({ ...form, tglExre: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kantor
                  </label>
                  <select
                    value={form.idKantor}
                    onChange={(e) => setForm({ ...form, idKantor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">— Kantor Pusat —</option>
                    {(kantorList || []).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Debet (Kas / Rekening Masuk) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.coaDebet}
                  onChange={(e) => setForm({ ...form, coaDebet: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Kas / Bank —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>
                      {c.coa} - {c.nama_perkiraan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kredit (Pendapatan / Dana Masuk) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.coaKredit}
                  onChange={(e) => setForm({ ...form, coaKredit: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Pendapatan —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>
                      {c.coa} - {c.nama_perkiraan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.nominal || ''}
                    onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })}
                    placeholder="250000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program FINS
                  </label>
                  <select
                    value={form.idProgram}
                    onChange={(e) => setForm({ ...form, idProgram: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value={0}>— Tanpa Program —</option>
                    {programList.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Penerimaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Keterangan donasi / penerimaan..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="directApprove"
                  checked={form.saveAndApprove}
                  onChange={(e) => setForm({ ...form, saveAndApprove: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="directApprove" className="text-xs font-medium text-slate-700">
                  Langsung Setujui & Terbitkan Jurnal (Approved)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

