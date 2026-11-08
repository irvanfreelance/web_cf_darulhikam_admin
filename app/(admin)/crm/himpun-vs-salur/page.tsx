"use client";

import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { Scale, ArrowUpRight, ArrowDownRight, Wallet, Percent } from 'lucide-react';

export default function HimpunVsSalurPage() {
  const { data, error, isLoading } = useSWR('/api/crm/analisis/hvs', jsonFetcher);

  const summary = data?.summary;

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Penghimpunan vs Penyaluran"
        description="Analisis perbandingan antara dana terhimpun dari transaksi donatur (PAID) dan dana tersalurkan per kampanye."
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-teal-700">
              <ArrowDownRight className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Himpunan</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatIDR(summary.total_himpun)}</p>
            <p className="text-xs text-slate-400 mt-1">Donasi masuk terverifikasi</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-rose-700">
              <ArrowUpRight className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Saluran</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatIDR(summary.total_salur)}</p>
            <p className="text-xs text-slate-400 mt-1">Dana cair ke mustahik</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Sisa Saldo Dana</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatIDR(summary.saldo_dana)}</p>
            <p className="text-xs text-slate-400 mt-1">Tersedia untuk program</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-emerald-700">
              <Percent className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Rasio Penyaluran</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.rasio_salur_persen}%</p>
            <p className="text-xs text-slate-400 mt-1">Efektivitas penyaluran</p>
          </div>
        </div>
      )}

      {/* Tabel Komparasi Kampanye */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Scale className="h-5 w-5 text-teal-600" />
          <h2 className="text-sm font-semibold text-slate-800">Komparasi per Program & Kampanye</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Nama Program / Kampanye</th>
                <th className="px-5 py-3.5 text-right">Penghimpunan (Himpun)</th>
                <th className="px-5 py-3.5 text-right">Realisasi (Salur)</th>
                <th className="px-5 py-3.5 text-right">Sisa Saldo</th>
                <th className="px-5 py-3.5 text-center">Rasio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.rows || data.rows.length === 0) ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Belum ada data penghimpunan atau penyaluran yang tercatat.
                  </td>
                </tr>
              ) : (
                data.rows.map((row: any) => (
                  <tr key={row.campaign_id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {row.campaign_title}
                    </td>
                    <td className="px-5 py-3.5 text-right text-teal-800 font-semibold">
                      {formatIDR(row.total_himpun)}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {row.donasi_count} transaksi
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-rose-800 font-semibold">
                      {formatIDR(row.total_salur)}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {row.salur_count} penyaluran
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-900 font-bold">
                      {formatIDR(row.saldo_dana)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.rasio_salur_persen >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : row.rasio_salur_persen >= 50
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.rasio_salur_persen}%
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

