"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { Truck, MapPin, HeartHandshake } from 'lucide-react';

export default function AnalisisSalurPage() {
  const { data, error, isLoading } = useSWR('/api/crm/analisis/salur', jsonFetcher);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Analisis Penyaluran"
        description="Distribusi realisasi dana penyaluran per program kerja, wilayah penerima, golongan asnaf, dan metode penyaluran."
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
          {/* Berdasarkan Program */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-800">Realisasi per Program</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_campaign || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="campaign" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Total Salur" fill="#0f766e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Berdasarkan Wilayah */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Realisasi per Wilayah</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_region || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="wilayah" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Total Salur" fill="#6366f1" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Berdasarkan Asnaf */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HeartHandshake className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Realisasi per Golongan Asnaf</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_asnaf || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="asnaf" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Total Salur" fill="#10b981" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Berdasarkan Jenis Penyaluran */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Metode Penyaluran</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_jenis || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="jenis" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatIDR(Number(value))} />
                  <Bar dataKey="nominal" name="Total Salur" fill="#14b8a6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

