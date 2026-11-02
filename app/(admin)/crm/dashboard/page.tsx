"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KPICard from '@/components/shared/kpi-card';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { BadgeCheck, UserPlus, Users, Repeat } from 'lucide-react';

type Dashboard = {
  kpi: {
    total: number;
    aktif: number;
    prospek: number;
    baru: number;
    retensi_basis: number;
    retensi_bertahan: number;
    retensi_persen: number | null;
  };
  tim: { tim: string; jumlah: number; aktif: number; prospek: number; berdonasi: number }[];
  bulanan: { bulan: string; baru: number }[];
};

export default function CrmDashboardPage() {
  const { data, error, isLoading } = useSWR<Dashboard>('/api/crm/dashboard', jsonFetcher);
  const kpi = data?.kpi;
  const banding = kpi ? [
    { nama: 'Baru bulan ini', jumlah: kpi.baru },
    { nama: 'Prospek', jumlah: kpi.prospek },
    { nama: 'Aktif', jumlah: kpi.aktif },
  ] : [];

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Dashboard Penghimpunan" description="Donatur aktif, prospek, donatur baru, dan retensi bulan ini per tim CRM." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />}
      {kpi && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard title="Total donatur" value={kpi.total} icon={Users} color="text-slate-600" bg="bg-slate-100" />
            <KPICard title="Aktif" value={kpi.aktif} icon={BadgeCheck} color="text-emerald-700" bg="bg-emerald-50" />
            <KPICard title="Prospek" value={kpi.prospek} icon={UserPlus} color="text-teal-700" bg="bg-teal-50" />
            <KPICard title="Baru bulan ini" value={kpi.baru} icon={UserPlus} color="text-slate-600" bg="bg-slate-100" />
            <KPICard title="Retensi bulan ini" value={kpi.retensi_persen == null ? '—' : `${kpi.retensi_persen}%`} icon={Repeat} color="text-emerald-700" bg="bg-emerald-50" />
          </div>
          <p className="text-xs text-slate-400">
            Prospek adalah donatur aktif yang belum punya invoice PAID. Retensi adalah {kpi.retensi_bertahan} dari {kpi.retensi_basis} donatur yang sudah berdonasi sebelum bulan ini dan berdonasi lagi bulan ini.
          </p>
        </>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Baru, prospek, dan aktif</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={banding}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="nama" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jumlah" name="Jumlah" fill="#0f766e" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Donatur baru per bulan</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data?.bulanan ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="baru" name="Baru" fill="#10b981" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Per tim CRM</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data?.tim ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tim" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="jumlah" name="Total" fill="#0f766e" radius={4} />
              <Bar dataKey="prospek" name="Prospek" fill="#99f6e4" radius={4} />
              <Bar dataKey="berdonasi" name="Pernah berdonasi" fill="#10b981" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
