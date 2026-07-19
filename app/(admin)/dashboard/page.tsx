"use client";

import React from 'react';
import useSWR from 'swr';
import {
  Receipt, Users, Megaphone, CheckCircle, TrendingUp,
  BarChart3, Eye, ArrowUpRight
} from 'lucide-react';
import KPICard from '@/components/shared/kpi-card';
import RevenueLineChart from '@/components/charts/revenue-line-chart';
import TargetGaugeChart from '@/components/charts/target-gauge-chart';
import { formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// formatIDR removed - using lib/format instead

const formatCompactNumber = (number: number) => {
  if (number >= 1e9) return (number / 1e9).toFixed(1) + 'M';
  if (number >= 1e6) return (number / 1e6).toFixed(1) + 'Jt';
  if (number >= 1e3) return (number / 1e3).toFixed(1) + 'Rb';
  return number;
};

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR('/api/stats', fetcher);

  if (error) return <div className="p-8 text-rose-500 font-semibold bg-rose-50 rounded-2xl border border-rose-100 italic">Gagal memuat statistik: {error.message}</div>;
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-semibold animate-pulse text-xs">Memuat data panel...</p>
    </div>
  );

  const { summary, revenueTrend } = data;

  return (
    <div className="space-y-8 pb-10">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Donasi"
          value={formatIDR(summary.totalRevenue)}
          icon={Receipt}
          color="text-teal-600"
          bg="bg-teal-50"
          trend={`${summary.revenueTrendPercent >= 0 ? '+' : ''}${summary.revenueTrendPercent}%`}
          trendUp={summary.revenueTrendPercent >= 0}
        />
        <KPICard
          title="Total Donatur"
          value={summary.totalDonors.toLocaleString()}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
          trend={`${summary.donorsTrendPercent >= 0 ? '+' : ''}${summary.donorsTrendPercent}%`}
          trendUp={summary.donorsTrendPercent >= 0}
        />
        <KPICard
          title="Kampanye Aktif"
          value={summary.activeCampaigns}
          icon={Megaphone}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <KPICard
          title="Transaksi Berhasil"
          value={summary.successTransactions.toLocaleString()}
          icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="font-normal text-slate-800 text-xl tracking-tight">Tren penghimpunan</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">7 hari terakhir</p>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-2xl shadow-sm border rotate-1 transition-transform group-hover:rotate-0",
              summary.revenueTrendPercent >= 0
                ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                : "text-rose-600 bg-rose-50 border-rose-100"
            )}>
              <TrendingUp size={16} className={summary.revenueTrendPercent < 0 ? "rotate-180" : ""} />
              {summary.revenueTrendPercent >= 0 ? '+' : ''}{summary.revenueTrendPercent}% dari bulan lalu
            </div>
          </div>
          <RevenueLineChart data={revenueTrend} />
        </div>

        {/* Achievement Gauge */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group">
          <h3 className="font-normal text-slate-800 text-xl tracking-tight mb-2">Pencapaian target ngo</h3>
          <p className="text-xs text-slate-400 font-medium mb-10">Tahun berjalan (ytd)</p>

          <TargetGaugeChart
            value={summary.totalRevenue}
            max={summary.targetRevenue}
            color="#14b8a6"
          />

          <div className="mt-8 w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3 transition-colors group-hover:bg-slate-100/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium text-[10px]">Terkumpul</span>
              <span className="font-bold text-teal-600">{formatCompactNumber(summary.totalRevenue)}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                style={{ width: `${(summary.totalRevenue / summary.targetRevenue) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium text-[10px]">Target</span>
              <span className="font-bold text-slate-800">{formatCompactNumber(summary.targetRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
