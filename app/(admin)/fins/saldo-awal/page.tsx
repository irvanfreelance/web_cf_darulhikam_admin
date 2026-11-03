"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Save, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type CoaSaldoItem = {
  coa: string;
  nama_perkiraan: string;
  saldo: 'd' | 'k';
  saldo_awal: number;
};

export default function SaldoAwalPage() {
  const [tanggal, setTanggal] = useState('2026-01-01');
  const [idKantor, setIdKantor] = useState('1');

  const { data, error, isLoading, mutate } = useSWR<CoaSaldoItem[]>(
    `/api/fins/saldo-awal?tanggal=${tanggal}&idKantor=${idKantor}`,
    jsonFetcher
  );

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  const [items, setItems] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const init: Record<string, number> = {};
      data.forEach((item) => {
        init[item.coa] = Number(item.saldo_awal || 0);
      });
      setItems(init);
    }
  }, [data]);

  // Hitung total debet vs kredit
  let totalDebet = 0;
  let totalKredit = 0;

  if (data) {
    data.forEach((item) => {
      const val = items[item.coa] || 0;
      if (item.saldo === 'd') totalDebet += val;
      else totalKredit += val;
    });
  }

  const selisih = Math.abs(totalDebet - totalKredit);
  const isBalanced = selisih === 0;

  const handleSave = async () => {
    if (!data) return;

    try {
      setIsSaving(true);
      const payload = {
        tanggal,
        idKantor: Number(idKantor),
        items: data.map((d) => ({
          coa: d.coa,
          saldo: items[d.coa] || 0,
        })),
      };

      const res = await fetch('/api/fins/saldo-awal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan saldo awal');
      }

      toast.success('Saldo awal COA berhasil disimpan');
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Saldo Awal COA"
        description="Pencatatan saldo awal per akun buku besar sebagai titik nol pembukuan neraca & buku harian"
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Saldo Awal
        </button>
      </PageHeader>

      {/* Filter Tanggal & Kantor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-white p-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Titik Nol Pembukuan <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kantor
          </label>
          <select
            value={idKantor}
            onChange={(e) => setIdKantor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            {(kantorList || []).map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Balance Indicator Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Saldo Debet</div>
          <div className="text-lg font-bold text-emerald-700">{formatIDR(totalDebet)}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Saldo Kredit</div>
          <div className="text-lg font-bold text-teal-700">{formatIDR(totalKredit)}</div>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${
          isBalanced ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {isBalanced ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="text-rose-600" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {isBalanced ? 'Seimbang (Balance)' : 'Tidak Seimbang'}
            </span>
          </div>
          <div className={`text-lg font-bold ${isBalanced ? 'text-emerald-800' : 'text-rose-800'}`}>
            Selisih: {formatIDR(selisih)}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Tabel Input Saldo Awal */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Kode COA</th>
                <th className="px-4 py-3 font-medium">Nama Akun Perkiraan</th>
                <th className="px-4 py-3 font-medium text-center">Posisi Normal</th>
                <th className="px-4 py-3 text-right font-medium">Saldo Awal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Memuat daftar akun COA...
                  </td>
                </tr>
              ) : data?.length ? (
                data.map((item) => (
                  <tr key={item.coa} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {item.coa}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.nama_perkiraan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        item.saldo === 'd'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}>
                        {item.saldo === 'd' ? 'Debet' : 'Kredit'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={items[item.coa] !== undefined ? items[item.coa] : ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setItems((prev) => ({ ...prev, [item.coa]: val }));
                        }}
                        className="w-48 text-right rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada akun transaksi COA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

