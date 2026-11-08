"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { BarChart2, Download, Filter, Users, CheckCircle, Wallet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LaporanPenyaluranPage() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [bulan, setBulan] = useState('');

  const queryUrl = `/api/penyaluran/laporan?tahun=${tahun}${bulan ? `&bulan=${bulan}` : ''}`;
  const { data, error, isLoading } = useSWR(queryUrl, jsonFetcher);

  const summary = data?.summary;
  const rows = data?.rows || [];

  const exportExcel = () => {
    if (rows.length === 0) return;
    const worksheetData = rows.map((r: any, idx: number) => ({
      No: idx + 1,
      'Program / Kampanye': r.campaign_title,
      'Jumlah Kegiatan': r.total_kegiatan,
      'Total Realisasi (Rp)': r.total_realisasi,
      'Estimasi Penerima': r.total_penerima,
      'Anggaran FINS (Rp)': r.budget_alokasi,
      'Serapan (%)': r.persen_realisasi != null ? `${r.persen_realisasi}%` : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penyaluran');
    XLSX.writeFile(wb, `Laporan_Penyaluran_${tahun}_${bulan || 'Semua'}.xlsx`);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Laporan Penyaluran"
          description="Rekapitulasi berkala penyaluran dana ke mustahik dan serapan anggaran program LAZ Darul Hikam."
        />
        <button
          onClick={exportExcel}
          disabled={rows.length === 0}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          Ekspor Excel
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Tahun & Bulan */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Filter className="h-4 w-4" /> Filter Periode:
        </div>
        <select
          aria-label="Filter Tahun"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>Tahun {y}</option>
          ))}
        </select>
        <select
          aria-label="Filter Bulan"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
        >
          <option value="">Semua Bulan (Tahunan)</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Bulan {m}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Total Realisasi
            </span>
            <p className="text-2xl font-bold text-teal-800">{formatIDR(summary.total_realisasi)}</p>
            <p className="text-xs text-slate-400 mt-1">Tersalurkan ke mustahik</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Jumlah Penyaluran
            </span>
            <p className="text-2xl font-bold text-slate-900">{summary.total_kegiatan} Kegiatan</p>
            <p className="text-xs text-slate-400 mt-1">Kegiatan terlaksana</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Total Penerima
            </span>
            <p className="text-2xl font-bold text-slate-900">{summary.total_penerima} Jiwa</p>
            <p className="text-xs text-slate-400 mt-1">Penerima manfaat tercatat</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Alokasi Anggaran
            </span>
            <p className="text-2xl font-bold text-slate-900">{formatIDR(summary.total_budget)}</p>
            <p className="text-xs text-slate-400 mt-1">
              Serapan: {summary.persen_realisasi != null ? `${summary.persen_realisasi}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Tabel Rincian Program */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-teal-600" />
          <h2 className="text-sm font-semibold text-slate-800">Rincian Penyaluran per Program</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Nama Program / Kampanye</th>
                <th className="px-5 py-3.5 text-center">Kegiatan</th>
                <th className="px-5 py-3.5 text-right">Realisasi (Rp)</th>
                <th className="px-5 py-3.5 text-center">Penerima</th>
                <th className="px-5 py-3.5 text-right">Budget (FINS)</th>
                <th className="px-5 py-3.5 text-center">Serapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada transaksi penyaluran yang tercatat pada periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr key={row.campaign_id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {row.campaign_title}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {row.total_kegiatan}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-teal-800">
                      {formatIDR(row.total_realisasi)}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {row.total_penerima} jiwa
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700">
                      {row.budget_alokasi > 0 ? formatIDR(row.budget_alokasi) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.persen_realisasi != null && row.persen_realisasi >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.persen_realisasi != null ? `${row.persen_realisasi}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

