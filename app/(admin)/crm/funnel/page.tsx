"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { Activity, Clock, CheckCircle, ArrowDown } from 'lucide-react';

export default function TransaksiFunnelPage() {
  const { data, error, isLoading } = useSWR('/api/crm/funnel', jsonFetcher);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Transaksi Funnel"
        description="Analisis konversi tahapan donasi dari pembuatan invoice, menunggu pembayaran, hingga terverifikasi (PAID)."
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {data && (
        <>
          {/* KPI Kecepatan & Konversi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-teal-700">
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Konversi Selesai</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.funnel?.[2]?.percent || 0}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Invoice berhasil dibayar (PAID)</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-indigo-700">
                <Clock className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Median Waktu Bayar</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.speed?.median_minutes || 0} Menit
              </p>
              <p className="text-xs text-slate-400 mt-1">50% donatur membayar dalam rentang ini</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-slate-700">
                <Clock className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Waktu Bayar</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.speed?.avg_minutes || 0} Menit
              </p>
              <p className="text-xs text-slate-400 mt-1">Rata-rata waktu hingga terbayar</p>
            </div>
          </div>

          {/* Visualisasi Funnel */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-semibold text-slate-800">Alur Tahapan Transaksi</h2>
            </div>

            <div className="space-y-4">
              {data.funnel?.map((step: any, index: number) => (
                <div key={step.stage} className="relative">
                  <div className="flex items-center justify-between text-sm mb-1.5 font-medium">
                    <span className="text-slate-800 font-semibold">{step.stage}</span>
                    <span className="text-slate-500">
                      {step.count.toLocaleString()} transaksi ({step.percent}%)
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 2
                          ? 'bg-emerald-500'
                          : index === 3
                          ? 'bg-rose-400'
                          : 'bg-teal-600'
                      }`}
                      style={{ width: `${Math.max(step.percent, 3)}%` }}
                    />
                  </div>
                  {index < data.funnel.length - 1 && (
                    <div className="flex justify-center my-1 text-slate-300">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Konversi per Metode Bayar */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Tingkat Keberhasilan Bayar per Metode (%)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.payment_methods || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="metode" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="rate" name="Success Rate (%)" fill="#0f766e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

