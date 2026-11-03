'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  Coins,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KopLembaga } from '@/components/fins/kop-lembaga';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LaporanBulananPage() {
  const [bulan, setBulan] = useState(11);
  const [tahun, setTahun] = useState(2026);

  const { data, error, isLoading } = useSWR(
    `/api/fins/laporan-bulanan?bulan=${bulan}&tahun=${tahun}`,
    fetcher
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data?.perProgram) return;
    const headers = ['Program', 'Kategori', 'Total Realisasi (Rp)'];
    const lines = data.perProgram.map((p: any) => [
      `"${p.nama_program}"`,
      `"${p.kategori || ''}"`,
      p.total_realisasi,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...lines.map((l: any[]) => l.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Bulanan_${bulan}_${tahun}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const trendData =
    data?.trend?.map((t: any) => ({
      name: `${t.bulan}/${String(t.tahun).slice(2)}`,
      Penerimaan: Number(t.masuk),
      Pengeluaran: Number(t.keluar),
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan Realisasi & Evaluasi Bulanan
          </h1>
          <p className="text-sm text-slate-500">
            Monitoring penerimaan, pengeluaran kas, alokasi program, dan per kantor cabang
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Periode:</span>
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border-none bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </select>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="border-none bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
        <KopLembaga
          title="Laporan Evaluasi & Realisasi Bulanan"
          subtitle="Arus Transaksi Donasi, Program & Kantor Operasional"
          periodeLabel={`Bulan ${bulan}/${tahun}`}
        />

        {/* Highlight KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase">Penerimaan Kas</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-950 mt-2">
              {formatIDR(data?.totalPenerimaan || 0)}
            </p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase">Pengeluaran & Program</span>
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-950 mt-2">
              {formatIDR(data?.totalPengeluaran || 0)}
            </p>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 uppercase">Surplus / (Defisit)</span>
              <Coins className="w-5 h-5 text-teal-600" />
            </div>
            <p
              className={`text-2xl font-bold mt-2 ${
                (data?.surplusDefisit || 0) >= 0 ? 'text-teal-950' : 'text-rose-600'
              }`}
            >
              {formatIDR(data?.surplusDefisit || 0)}
            </p>
          </div>
        </div>

        {/* Grafik Tren 12 Bulan (Print:hidden) */}
        <div className="print:hidden rounded-xl border border-slate-200 p-5 bg-white space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Tren Arus Transaksi 12 Bulan Terakhir
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                />
                <Tooltip
                  formatter={(value: any) => [formatIDR(Number(value)), '']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Penerimaan" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Realisasi per Program & per Kantor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Program */}
          <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Realisasi Pengeluaran per Program
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead>
                  <tr className="text-slate-500 font-semibold text-left">
                    <th className="py-2">Program</th>
                    <th className="py-2 text-right">Realisasi (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data?.perProgram?.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-400">
                        Tidak ada pengeluaran program pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    data?.perProgram?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 font-medium">
                          {p.nama_program}
                          <span className="text-[10px] text-slate-400 block">
                            {p.kategori || 'Umum'}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-rose-600">
                          {formatIDR(Number(p.total_realisasi))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kantor */}
          <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Arus Kas per Kantor Cabang
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead>
                  <tr className="text-slate-500 font-semibold text-left">
                    <th className="py-2">Kantor</th>
                    <th className="py-2 text-right">Masuk</th>
                    <th className="py-2 text-right">Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data?.perKantor?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        Tidak ada data kantor.
                      </td>
                    </tr>
                  ) : (
                    data?.perKantor?.map((k: any) => (
                      <tr key={k.id}>
                        <td className="py-2 font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {k.nama_kantor}
                        </td>
                        <td className="py-2 text-right font-mono text-emerald-600">
                          {formatIDR(Number(k.total_masuk))}
                        </td>
                        <td className="py-2 text-right font-mono text-rose-600">
                          {formatIDR(Number(k.total_keluar))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500">Disiapkan Oleh,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline">Irvan</p>
            <p className="text-slate-500">Finance & Accounting Officer</p>
          </div>
          <div>
            <p className="text-slate-500">Disetujui Oleh,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline">Pimpinan Cabang / Lembaga</p>
            <p className="text-slate-500">LAZ Darul Hikam</p>
          </div>
        </div>
      </div>
    </div>
  );
}
