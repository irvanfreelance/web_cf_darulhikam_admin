"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Download, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function TrialBalancePage() {
  const [periodeFrom, setPeriodeFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [periodeTo, setPeriodeTo] = useState(new Date().toISOString().slice(0, 10));
  const [idKantor, setIdKantor] = useState('all');

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  const queryParams = `periodeFrom=${periodeFrom}&periodeTo=${periodeTo}&idKantor=${idKantor}`;
  const { data, error, isLoading } = useSWR<any>(
    `/api/fins/trial-balance?${queryParams}`,
    jsonFetcher
  );

  const rows = data?.rows || [];
  const summary = data?.summary || {
    totSaDebet: 0,
    totSaKredit: 0,
    totMutDebet: 0,
    totMutKredit: 0,
    totAdjDebet: 0,
    totAdjKredit: 0,
    totAkDebet: 0,
    totAkKredit: 0,
    isBalanced: true,
  };

  const handleExport = () => {
    if (!rows.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportRows = rows.map((r: any) => ({
      'Kode Akun': r.coa,
      'Nama Perkiraan': r.nama_perkiraan,
      'Saldo Awal Debet': r.saDebet,
      'Saldo Awal Kredit': r.saKredit,
      'Mutasi Debet': r.mutDebet,
      'Mutasi Kredit': r.mutKredit,
      'Penyesuaian Debet': r.adjDebet,
      'Penyesuaian Kredit': r.adjKredit,
      'Saldo Akhir Debet': r.akDebet,
      'Saldo Akhir Kredit': r.akKredit,
    }));

    exportRows.push({
      'Kode Akun': 'TOTAL',
      'Nama Perkiraan': summary.isBalanced ? 'BALANCE' : 'SELISIH',
      'Saldo Awal Debet': summary.totSaDebet,
      'Saldo Awal Kredit': summary.totSaKredit,
      'Mutasi Debet': summary.totMutDebet,
      'Mutasi Kredit': summary.totMutKredit,
      'Penyesuaian Debet': summary.totAdjDebet,
      'Penyesuaian Kredit': summary.totAdjKredit,
      'Saldo Akhir Debet': summary.totAkDebet,
      'Saldo Akhir Kredit': summary.totAkKredit,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');
    XLSX.writeFile(workbook, `Trial_Balance_${periodeFrom}_sd_${periodeTo}.xlsx`);
    toast.success('Trial balance berhasil diexport');
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Trial Balance (Neraca Saldo)"
        description="Neraca saldo seluruh akun perkiraan: saldo awal, mutasi berjalan, entri penyesuaian (AJE), dan saldo akhir"
      >
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
        >
          <Printer size={16} /> Cetak
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!rows.length}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50 print:hidden"
        >
          <Download size={16} /> Export Excel
        </button>
      </PageHeader>

      {/* Filter Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-white p-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={periodeFrom}
            onChange={(e) => setPeriodeFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={periodeTo}
            onChange={(e) => setPeriodeTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Kantor</label>
          <select
            value={idKantor}
            onChange={(e) => setIdKantor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Semua Kantor</option>
            {(kantorList || []).map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Balance Indicator */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between ${
        summary.isBalanced ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
      }`}>
        <div className="flex items-center gap-3">
          {summary.isBalanced ? (
            <CheckCircle2 size={20} className="text-emerald-700" />
          ) : (
            <AlertCircle size={20} className="text-rose-700" />
          )}
          <div>
            <div className="text-sm font-bold text-slate-900">
              {summary.isBalanced ? 'Neraca Saldo SEIMBANG (Balanced)' : 'Neraca Saldo TIDAK SEIMBANG'}
            </div>
            <div className="text-xs text-slate-600">
              Total Debet: {formatIDR(summary.totAkDebet)} &bull; Total Kredit: {formatIDR(summary.totAkKredit)}
            </div>
          </div>
        </div>
        {!summary.isBalanced && (
          <div className="text-sm font-bold text-rose-700">
            Selisih: {formatIDR(Math.abs(summary.totAkDebet - summary.totAkKredit))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Tabel 8 Kolom Standar Akuntansi */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th rowSpan={2} className="px-3 py-2 font-medium">Kode Akun</th>
                <th rowSpan={2} className="px-3 py-2 font-medium">Nama Perkiraan</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-center border-l bg-slate-100/50">Saldo Awal</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-center border-l bg-slate-100/50">Mutasi Berjalan</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-center border-l bg-slate-100/50">Penyesuaian (AJE)</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-center border-l bg-teal-50">Saldo Akhir</th>
              </tr>
              <tr className="border-t">
                <th className="px-2 py-1.5 text-right font-medium border-l">Debet</th>
                <th className="px-2 py-1.5 text-right font-medium">Kredit</th>
                <th className="px-2 py-1.5 text-right font-medium border-l">Debet</th>
                <th className="px-2 py-1.5 text-right font-medium">Kredit</th>
                <th className="px-2 py-1.5 text-right font-medium border-l">Debet</th>
                <th className="px-2 py-1.5 text-right font-medium">Kredit</th>
                <th className="px-2 py-1.5 text-right font-semibold border-l text-teal-900 bg-teal-50">Debet</th>
                <th className="px-2 py-1.5 text-right font-semibold text-teal-900 bg-teal-50">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">Memuat neraca saldo...</td></tr>
              ) : rows.length ? (
                rows.map((r: any) => (
                  <tr key={r.coa} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">{r.coa}</td>
                    <td className="px-3 py-2 text-slate-700">{r.nama_perkiraan}</td>
                    <td className="px-2 py-2 text-right border-l font-mono">{r.saDebet > 0 ? formatIDR(r.saDebet, false) : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono">{r.saKredit > 0 ? formatIDR(r.saKredit, false) : '—'}</td>
                    <td className="px-2 py-2 text-right border-l font-mono">{r.mutDebet > 0 ? formatIDR(r.mutDebet, false) : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono">{r.mutKredit > 0 ? formatIDR(r.mutKredit, false) : '—'}</td>
                    <td className="px-2 py-2 text-right border-l font-mono">{r.adjDebet > 0 ? formatIDR(r.adjDebet, false) : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono">{r.adjKredit > 0 ? formatIDR(r.adjKredit, false) : '—'}</td>
                    <td className="px-2 py-2 text-right border-l font-mono font-bold text-slate-900 bg-teal-50/30">
                      {r.akDebet > 0 ? formatIDR(r.akDebet, false) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-slate-900 bg-teal-50/30">
                      {r.akKredit > 0 ? formatIDR(r.akKredit, false) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Tidak ada saldo atau mutasi pada periode ini.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-right uppercase">TOTAL:</td>
                  <td className="px-2 py-2.5 text-right border-l font-mono">{formatIDR(summary.totSaDebet, false)}</td>
                  <td className="px-2 py-2.5 text-right font-mono">{formatIDR(summary.totSaKredit, false)}</td>
                  <td className="px-2 py-2.5 text-right border-l font-mono">{formatIDR(summary.totMutDebet, false)}</td>
                  <td className="px-2 py-2.5 text-right font-mono">{formatIDR(summary.totMutKredit, false)}</td>
                  <td className="px-2 py-2.5 text-right border-l font-mono">{formatIDR(summary.totAdjDebet, false)}</td>
                  <td className="px-2 py-2.5 text-right font-mono">{formatIDR(summary.totAdjKredit, false)}</td>
                  <td className="px-2 py-2.5 text-right border-l font-mono text-teal-900 bg-teal-100/50">{formatIDR(summary.totAkDebet, false)}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-teal-900 bg-teal-100/50">{formatIDR(summary.totAkKredit, false)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

