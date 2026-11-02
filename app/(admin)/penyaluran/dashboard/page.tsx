"use client";

import useSWR from 'swr';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KPICard from '@/components/shared/kpi-card';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { ClipboardList, CheckCircle2, Truck, Users } from 'lucide-react';

type Dashboard = {
  kpi: {
    pengajuan: number;
    menunggu: number;
    disetujui: number;
    disalurkan: number;
    nilai_diajukan: number;
    nilai_disetujui: number;
    nilai_realisasi: number;
    lpj: number;
    penerima: number;
    penerima_terverifikasi: number;
  };
  status: { status: string; jumlah: number; nominal: string | number }[];
  bulanan: { bulan: string; diajukan: number; disalurkan: number }[];
  verifikasi: { status: string; jumlah: number }[];
};

const LABEL: Record<string, string> = {
  draft: 'Draf',
  submitted: 'Diajukan',
  reviewed: 'Direview',
  approved: 'Disetujui',
  disbursed: 'Disalurkan',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  unverified: 'Belum diperiksa',
  verified: 'Terverifikasi',
};

export default function PenyaluranDashboardPage() {
  const { data, error, isLoading } = useSWR<Dashboard>('/api/penyaluran/dashboard', jsonFetcher);
  const kpi = data?.kpi;

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Dashboard Penyaluran" description="Angka dari pengajuan dan penerima manfaat. Disalurkan berarti realisasi tercatat, belum jurnal." />
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />}
      {kpi && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Pengajuan" value={kpi.pengajuan} icon={ClipboardList} color="text-slate-600" bg="bg-slate-100" />
          <KPICard title="Menunggu keputusan" value={kpi.menunggu} icon={ClipboardList} color="text-teal-700" bg="bg-teal-50" />
          <KPICard title="Disetujui, belum disalurkan" value={kpi.disetujui} icon={CheckCircle2} color="text-emerald-700" bg="bg-emerald-50" />
          <KPICard title="Disalurkan" value={kpi.disalurkan} icon={Truck} color="text-emerald-700" bg="bg-emerald-50" />
          <KPICard title="Nilai diajukan" value={formatIDR(kpi.nilai_diajukan)} icon={ClipboardList} color="text-slate-600" bg="bg-slate-100" />
          <KPICard title="Nilai disetujui + disalurkan" value={formatIDR(kpi.nilai_disetujui)} icon={CheckCircle2} color="text-teal-700" bg="bg-teal-50" />
          <KPICard title="Realisasi LPJ" value={formatIDR(kpi.nilai_realisasi)} icon={Truck} color="text-emerald-700" bg="bg-emerald-50" />
          <KPICard title="Penerima terverifikasi" value={`${kpi.penerima_terverifikasi}/${kpi.penerima}`} icon={Users} color="text-slate-600" bg="bg-slate-100" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Pengajuan per bulan</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data?.bulanan ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="diajukan" name="Diajukan" fill="#0f766e" radius={4} />
                <Bar dataKey="disalurkan" name="Disalurkan" fill="#10b981" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Status pengajuan</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={(data?.status ?? []).map((row) => ({ ...row, label: LABEL[row.status] || row.status }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jumlah" name="Jumlah" fill="#0f766e" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Verifikasi penerima manfaat</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {(data?.verifikasi ?? []).map((row) => (
            <div key={row.status} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-slate-400">{LABEL[row.status] || row.status}</div>
              <div className="text-lg text-slate-800">{row.jumlah}</div>
            </div>
          ))}
          {!data?.verifikasi?.length && !isLoading && <p className="text-sm text-slate-400">Belum ada penerima manfaat.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-400">LPJ tercatat: {kpi?.lpj ?? 0}</p>
      </section>
    </div>
  );
}
