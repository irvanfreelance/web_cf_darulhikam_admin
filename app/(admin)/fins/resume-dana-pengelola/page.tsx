"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Percent, Download, Printer, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function ResumeDanaPengelolaPage() {
  const [periodeFrom, setPeriodeFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [periodeTo, setPeriodeTo] = useState(new Date().toISOString().slice(0, 10));
  const [idKantor, setIdKantor] = useState('all');

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  const queryParams = `periodeFrom=${periodeFrom}&periodeTo=${periodeTo}&idKantor=${idKantor}`;
  const { data, error, isLoading, mutate } = useSWR<any>(
    `/api/fins/resume-dana-pengelola?${queryParams}`,
    jsonFetcher
  );

  const rows = data?.rows || [];
  const summary = data?.summary || { totalPenerimaan: 0, totalHakDp: 0 };

  const handleExport = () => {
    if (!rows.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportRows = rows.map((r: any) => ({
      'Kode Program': r.kode,
      'Nama Program': r.nama,
      'Tarif DP (%)': `${r.dpPercent}%`,
      'Total Penerimaan (Rp)': r.penerimaan,
      'Hak Amil / DP (Rp)': r.hakDp,
    }));

    exportRows.push({
      'Kode Program': 'TOTAL',
      'Nama Program': 'SEMUA PROGRAM',
      'Tarif DP (%)': '-',
      'Total Penerimaan (Rp)': summary.totalPenerimaan,
      'Hak Amil / DP (Rp)': summary.totalHakDp,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resume Dana Pengelola');
    XLSX.writeFile(workbook, `Resume_DP_${periodeFrom}_sd_${periodeTo}.xlsx`);
    toast.success('Resume DP berhasil diexport');
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Resume Dana Pengelola (Hak Amil)"
        description="Rekapitulasi perolehan hak amil / dana pengelola (DP) per program berdasarkan persentase resmi"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Penerimaan Dana Program</div>
          <div className="text-2xl font-bold text-slate-800">{formatIDR(summary.totalPenerimaan)}</div>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 shadow-sm">
          <div className="text-xs font-semibold text-teal-700 mb-1">Total Hak Amil / Dana Pengelola (DP)</div>
          <div className="text-2xl font-bold text-teal-800">{formatIDR(summary.totalHakDp)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Tabel Resume DP */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Kode Program</th>
                <th className="px-4 py-3 font-medium">Nama Program</th>
                <th className="px-4 py-3 text-right font-medium">Persentase DP (%)</th>
                <th className="px-4 py-3 text-right font-medium">Total Penerimaan</th>
                <th className="px-4 py-3 text-right font-medium text-teal-800">Hak Amil / DP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat resume dana pengelola...</td></tr>
              ) : rows.length ? (
                rows.map((r: any) => (
                  <tr key={r.idProgram} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.kode}</td>
                    <td className="px-4 py-3 text-slate-700">{r.nama}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {Number(r.dpPercent).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatIDR(r.penerimaan)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-teal-800 bg-teal-50/20">
                      {formatIDR(r.hakDp)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Belum ada penerimaan program pada periode ini.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right uppercase">TOTAL:</td>
                  <td className="px-4 py-3 text-right">{formatIDR(summary.totalPenerimaan)}</td>
                  <td className="px-4 py-3 text-right text-teal-800 bg-teal-100/50">{formatIDR(summary.totalHakDp)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

