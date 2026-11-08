"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { Users, Award, MapPin, Compass } from 'lucide-react';

export default function AnalisaDonaturPage() {
  const { data, error, isLoading } = useSWR('/api/crm/analisa/donatur', jsonFetcher);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Analisa Donatur"
        description="Segmentasi demografi, minat program, sebaran kantor cabang, dan valuasi tier donatur LAZ Darul Hikam."
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
          {/* Valuasi Tier Donatur */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-800">Segmentasi Nilai Donatur (Tiering)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {data.tier?.map((item: any) => (
                <div key={item.tier} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{item.tier}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{item.count} Donatur</p>
                  <p className="text-xs text-teal-700 font-medium mt-1">Total: {formatIDR(item.total_donasi)}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Berdasarkan Jenis Donatur */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-800">Profil Jenis Donatur</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.jenis || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="jenis" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah Donatur" fill="#0f766e" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Berdasarkan Gender */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-800">Komposisi Gender</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gender || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="gender" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah" fill="#6366f1" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Sebaran Kantor */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-800">Sebaran Kantor Operasional</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.kantor || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="kantor" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Donatur" fill="#10b981" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Minat Program */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-semibold text-slate-800">Minat Program Favorit</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.minat || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="minat" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Peminat" fill="#14b8a6" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

