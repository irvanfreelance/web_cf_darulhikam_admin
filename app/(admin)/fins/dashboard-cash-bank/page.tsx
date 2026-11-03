"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Wallet,
  Building,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import KPICard from '@/components/shared/kpi-card';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type DashboardData = {
  summary: {
    totalKas: number;
    totalBank: number;
    totalSaldo: number;
    mutasiMasukHariIni: number;
    mutasiKeluarHariIni: number;
    caMenungguCair: number;
    countMenungguCair: number;
    caBelumLpj: number;
    countBelumLpj: number;
  };
  accounts: Array<{
    id: string;
    label: string;
    coa: string;
    tipe: 'kas' | 'bank';
    saldo: number;
  }>;
  trend: Array<{
    tanggal: string;
    penerimaan: number;
    pengeluaran: number;
  }>;
};

export default function DashboardCashBankPage() {
  const [kantorId, setKantorId] = useState('all');

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    `/api/fins/dashboard-cash-bank?kantorId=${kantorId}`,
    jsonFetcher
  );

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  const summary = data?.summary || {
    totalKas: 0,
    totalBank: 0,
    totalSaldo: 0,
    mutasiMasukHariIni: 0,
    mutasiKeluarHariIni: 0,
    caMenungguCair: 0,
    countMenungguCair: 0,
    caBelumLpj: 0,
    countBelumLpj: 0,
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Dashboard Cash & Bank"
        description="Monitoring likuiditas kas, saldo rekening bank lembaga, dan posisi cash advance berjalan"
      >
        <button
          type="button"
          onClick={() => mutate()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin text-teal-600' : 'text-teal-600'} />
          Segarkan
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Kantor */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <label className="text-sm font-semibold text-slate-700">Filter Kantor:</label>
        <select
          value={kantorId}
          onChange={(e) => setKantorId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="all">Semua Kantor</option>
          {(kantorList || []).map((k: any) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Kas Fisik"
          value={formatIDR(summary.totalKas)}
          icon={Wallet}
          color="text-emerald-700"
          bg="bg-emerald-50"
        />
        <KPICard
          title="Total Rekening Bank"
          value={formatIDR(summary.totalBank)}
          icon={Building}
          color="text-teal-700"
          bg="bg-teal-50"
        />
        <KPICard
          title="Total Likuiditas (Kas + Bank)"
          value={formatIDR(summary.totalSaldo)}
          icon={Wallet}
          color="text-blue-700"
          bg="bg-blue-50"
        />
      </div>

      {/* KPI Tambahan: Mutasi Hari Ini & CA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Penerimaan Hari Ini</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownRight size={16} />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatIDR(summary.mutasiMasukHariIni)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pengeluaran Hari Ini</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatIDR(summary.mutasiKeluarHariIni)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">CA Menunggu Cair</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={16} />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatIDR(summary.caMenungguCair)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.countMenungguCair} pengajuan (status AS)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">CA Belum LPJ</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileCheck2 size={16} />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatIDR(summary.caBelumLpj)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.countBelumLpj} transaksi (status A)
          </div>
        </div>
      </div>

      {/* Rincian Saldo Per Rekening & Kas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kas & Bank List */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Rincian Saldo Kas & Bank</h3>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {data?.accounts?.length ? (
              data.accounts.map((acc) => (
                <div key={acc.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        acc.tipe === 'bank'
                          ? 'bg-teal-50 text-teal-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {acc.tipe === 'bank' ? <Building size={18} /> : <Wallet size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{acc.label}</div>
                      <div className="text-xs text-slate-400">COA: {acc.coa}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {formatIDR(acc.saldo)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                Belum ada rekening bank atau kas aktif.
              </div>
            )}
          </div>
        </div>

        {/* Grafik Tren 30 Hari */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Tren Penerimaan & Pengeluaran (30 Hari)</h3>
          <div className="h-72 w-full">
            {data?.trend?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : `${v}`)}
                  />
                  <Tooltip
                    formatter={(value: any) => formatIDR(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="penerimaan"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorIn)"
                    name="Penerimaan"
                  />
                  <Area
                    type="monotone"
                    dataKey="pengeluaran"
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#colorOut)"
                    name="Pengeluaran"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Belum ada data transaksi dalam 30 hari terakhir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

