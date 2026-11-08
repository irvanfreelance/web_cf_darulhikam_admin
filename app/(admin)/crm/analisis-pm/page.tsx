"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { Users2, ShieldCheck, Heart } from 'lucide-react';

export default function AnalisisPmPage() {
  const { data, error, isLoading } = useSWR('/api/crm/analisis/pm', jsonFetcher);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Analisis Penerima Manfaat (Mustahik)"
        description="Profil demografi mustahik, status verifikasi lapangan, kondisi ekonomi, dan klasifikasi asnaf zakat."
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
          {/* Status Verifikasi Lapangan */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-800">Status Verifikasi Kelayakan</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.verifikasi || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="status_verifikasi" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah PM" fill="#0f766e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Kondisi Ekonomi */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Tingkat Kondisi Ekonomi</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ekonomi || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah PM" fill="#6366f1" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Golongan Asnaf */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-rose-500" />
              <h2 className="text-sm font-semibold text-slate-800">Sebaran Asnaf Zakat</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.asnaf || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="asnaf" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah PM" fill="#f43f5e" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Tipe Penerima */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Kategori Penerima (Individu vs Lembaga)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.kategori || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="kategori" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah" fill="#14b8a6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

