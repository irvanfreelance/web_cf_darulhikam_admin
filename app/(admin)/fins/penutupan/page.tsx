"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Lock, Unlock, Calendar, DollarSign, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function PenutupanPage() {
  const [activeTab, setActiveTab] = useState<'harian' | 'periode'>('harian');

  // Harian State
  const [tglHarian, setTglHarian] = useState(new Date().toISOString().slice(0, 10));
  const [coaHarian, setCoaHarian] = useState('');
  const [idKantor, setIdKantor] = useState('1');
  const [kertas, setKertas] = useState<Record<string, number>>({
    '100000': 0, '50000': 0, '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0
  });
  const [logam, setLogam] = useState<Record<string, number>>({
    '1000': 0, '500': 0, '200': 0, '100': 0
  });
  const [keteranganHarian, setKeteranganHarian] = useState('');
  const [isSubmittingHarian, setIsSubmittingHarian] = useState(false);

  // Periode State
  const { data: periods, isLoading: loadingPeriods, mutate: mutatePeriods } = useSWR<any[]>(
    '/api/fins/penutupan/periode/1', // GET returns all
    jsonFetcher
  );

  const { data: bankAccounts } = useSWR<any[]>('/api/fins/rekening-bank', async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    return json?.rows || json || [];
  });

  const { data: offices } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  // Hitung total fisik dari pecahan
  const totalKertas = Object.entries(kertas).reduce((sum, [denom, count]) => sum + Number(denom) * (count || 0), 0);
  const totalLogam = Object.entries(logam).reduce((sum, [denom, count]) => sum + Number(denom) * (count || 0), 0);
  const totalFisik = totalKertas + totalLogam;

  const handleSubmitHarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coaHarian) {
      toast.error('Pilih akun kas yang diopname');
      return;
    }

    try {
      setIsSubmittingHarian(true);
      const res = await fetch('/api/fins/penutupan/harian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tglHarian,
          coa: coaHarian,
          idKantor: Number(idKantor),
          totalFisik,
          detailKertas: JSON.stringify(kertas),
          detailLogam: JSON.stringify(logam),
          keterangan: keteranganHarian,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan opname kas');
      }

      const json = await res.json();
      toast.success(
        `Opname kas harian berhasil disimpan. Selisih fisik vs sistem: ${formatIDR(json.adjustment)}`
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingHarian(false);
    }
  };

  const handlePeriodAction = async (periodId: number, action: 'open' | 'closed') => {
    try {
      toast.loading(`Memproses periode...`);
      const res = await fetch(`/api/fins/penutupan/periode/${periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah status periode');
      }

      toast.dismiss();
      toast.success(`Status periode berhasil diubah menjadi ${action.toUpperCase()}`);
      mutatePeriods();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Penutupan Kas & Periode"
        description="Fisik opname kas harian berdasar rincian pecahan serta kontrol buka/tutup periode akuntansi"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('harian')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'harian'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Opname Kas Harian (Fisik)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('periode')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'periode'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Status Periode Akuntansi
        </button>
      </div>

      {/* TAB 1: OPNAME HARIAN */}
      {activeTab === 'harian' && (
        <form onSubmit={handleSubmitHarian} className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-white p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Opname</label>
              <input
                type="date"
                required
                value={tglHarian}
                onChange={(e) => setTglHarian(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Kas</label>
              <select
                required
                value={coaHarian}
                onChange={(e) => setCoaHarian(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="">— Pilih Akun Kas —</option>
                {(bankAccounts || []).map((b: any) => (
                  <option key={b.id_rekening} value={b.coa}>{b.keterangan} ({b.coa})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kantor</label>
              <select
                value={idKantor}
                onChange={(e) => setIdKantor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                {(offices || []).map((o: any) => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rincian Pecahan Uang Kertas & Logam */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kertas */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-bold text-slate-800">Uang Kertas</span>
                <span className="text-xs font-bold text-teal-700">{formatIDR(totalKertas)}</span>
              </div>
              {Object.keys(kertas).map((denom) => (
                <div key={denom} className="flex items-center justify-between text-xs">
                  <span className="w-24 font-medium text-slate-700">{formatIDR(Number(denom))}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">&times;</span>
                    <input
                      type="number"
                      min="0"
                      value={kertas[denom] || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setKertas((prev) => ({ ...prev, [denom]: val }));
                      }}
                      className="w-20 text-center rounded-lg border border-slate-200 bg-slate-50 py-1 text-xs font-semibold"
                    />
                    <span className="w-28 text-right font-medium text-slate-800">
                      = {formatIDR(Number(denom) * (kertas[denom] || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Logam */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-bold text-slate-800">Uang Logam</span>
                <span className="text-xs font-bold text-teal-700">{formatIDR(totalLogam)}</span>
              </div>
              {Object.keys(logam).map((denom) => (
                <div key={denom} className="flex items-center justify-between text-xs">
                  <span className="w-24 font-medium text-slate-700">{formatIDR(Number(denom))}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">&times;</span>
                    <input
                      type="number"
                      min="0"
                      value={logam[denom] || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLogam((prev) => ({ ...prev, [denom]: val }));
                      }}
                      className="w-20 text-center rounded-lg border border-slate-200 bg-slate-50 py-1 text-xs font-semibold"
                    />
                    <span className="w-28 text-right font-medium text-slate-800">
                      = {formatIDR(Number(denom) * (logam[denom] || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total Fisik & Keterangan */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-base font-bold text-slate-800 border-b pb-3">
              <span>Total Hitung Kas Fisik:</span>
              <span className="text-xl text-teal-700">{formatIDR(totalFisik)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Penyesuaian (Wajib bila ada selisih kas fisik vs sistem)
              </label>
              <textarea
                rows={2}
                value={keteranganHarian}
                onChange={(e) => setKeteranganHarian(e.target.value)}
                placeholder="Alasan selisih kas fisik vs sistem bila ditemukan..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingHarian}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {isSubmittingHarian && <Loader2 size={16} className="animate-spin" />}
                Simpan Opname Kas Fisik
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: PERIODE AKUNTANSI */}
      {activeTab === 'periode' && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Bulan / Tahun</th>
                  <th className="px-4 py-3 font-medium text-right">Penerimaan</th>
                  <th className="px-4 py-3 font-medium text-right">Pengeluaran</th>
                  <th className="px-4 py-3 font-medium text-right">Surplus / (Defisit)</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingPeriods ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat periode...</td></tr>
                ) : periods?.length ? (
                  periods.map((p) => (
                    <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Periode {p.periode_bulan} / {p.periode_tahun}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                        {formatIDR(Number(p.total_penerimaan || 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700 font-medium">
                        {formatIDR(Number(p.total_pengeluaran || 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatIDR(Number(p.surplus_defisit || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                          p.status === 'closed'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {p.status === 'closed' ? <Lock size={12} /> : <Unlock size={12} />}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => handlePeriodAction(p.id, 'closed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-semibold"
                          >
                            <Lock size={13} /> Tutup Buku
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePeriodAction(p.id, 'open')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold"
                          >
                            <Unlock size={13} /> Buka Kembali
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada periode akuntansi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

