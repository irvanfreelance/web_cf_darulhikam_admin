"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { TrendingUp, CreditCard, Flame, Layers } from 'lucide-react';

export default function AnalisaTransaksiPage() {
  const { data, error, isLoading } = useSWR('/api/crm/analisa/transaksi', jsonFetcher);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Analisa Transaksi"
        description="Tren volume transaksi bulanan, kanal pembayaran terfavorit, kampanye teratas, dan sebaran ukuran donasi."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Tren Bulanan */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-800">Tren Penghimpunan Bulanan (Rp)</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Line type="monotone" dataKey="nominal" name="Nominal (Rp)" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Metode Pembayaran */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Metode Pembayaran Terbanyak</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.methods || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="metode" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Nominal Donasi" fill="#6366f1" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top Kampanye */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-rose-500" />
              <h2 className="text-sm font-semibold text-slate-800">Top Program & Kampanye</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.campaigns || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="campaign" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Himpunan" fill="#f43f5e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Ticket Size Range */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Sebaran Ukuran Donasi (Ticket Size)</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sizes || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah Transaksi" fill="#10b981" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

