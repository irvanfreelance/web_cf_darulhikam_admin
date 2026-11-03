'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Printer,
  Download,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { KopLembaga } from '@/components/fins/kop-lembaga';
import { ReportTable } from '@/components/fins/report-table';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const REPORT_TABS = [
  { id: 'LPK', label: 'Posisi Keuangan (LPK)', sub: 'Neraca / Aset & Liabilitas' },
  { id: 'LPO', label: 'Operasional (LPO)', sub: 'Penghasilan Komprehensif' },
  { id: 'LA', label: 'Aktivitas PSAK 45', sub: 'Perubahan Aset Bersih TK/TS/TP' },
  { id: 'LAK', label: 'Arus Kas (LAK)', sub: 'Aktivitas Operasi & Investasi' },
  { id: 'CALK', label: 'Catatan (CALK)', sub: 'Kebijakan & Penjelasan Pos' },
];

export default function LaporanKeuanganPage() {
  const [activeTab, setActiveTab] = useState('LPK');
  const [bulan, setBulan] = useState(11);
  const [tahun, setTahun] = useState(2026);

  const reportUrl =
    activeTab !== 'CALK'
      ? `/api/fins/laporan/${activeTab}?bulan=${bulan}&tahun=${tahun}`
      : null;

  const { data: reportData, error, isLoading } = useSWR(reportUrl, fetcher);
  const { data: calkNotes } = useSWR(activeTab === 'CALK' ? `/api/fins/calk` : null, fetcher);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData?.rows) return;
    const headers = ['Kode', 'Pos / Akun', 'Level', `Periode Berjalan`, `Periode Pembanding`];
    const lines = reportData.rows.map((r: any) => [
      `"${r.kode || ''}"`,
      `"${r.namaCoa.replace(/<\/?b>/gi, '')}"`,
      r.level,
      r.nilaiBerjalan !== null ? r.nilaiBerjalan : '',
      r.nilaiPembanding !== null ? r.nilaiPembanding : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...lines.map((l: any[]) => l.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_${activeTab}_${bulan}_${tahun}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodeBerjalanLabel = `Bulan ${bulan}/${tahun}`;
  const prevBulan = bulan === 1 ? 12 : bulan - 1;
  const prevTahun = bulan === 1 ? tahun - 1 : tahun;
  const periodePembandingLabel = `Bulan ${prevBulan}/${prevTahun}`;

  return (
    <div className="space-y-6">
      {/* Header & Filter (Disembunyikan saat Cetak/Print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Laporan Keuangan Entitas Nirlaba
            </h1>
            <p className="text-sm text-slate-500">
              Standar PSAK 45 / ISAK 35 dengan multi-level COA dan kalkulasi otomatis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Ekspor CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Tab & Periode Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1">
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Periode:</span>
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm"
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Report Container (Tampil di Layar dan Dicetak) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        <KopLembaga
          title={
            activeTab === 'LPK'
              ? 'Laporan Posisi Keuangan (Neraca)'
              : activeTab === 'LPO'
              ? 'Laporan Penghasilan Komprehensif (LPO)'
              : activeTab === 'LA'
              ? 'Laporan Aktivitas (PSAK 45)'
              : activeTab === 'LAK'
              ? 'Laporan Arus Kas'
              : 'Catatan Atas Laporan Keuangan (CALK)'
          }
          subtitle="Standar Akuntansi Keuangan Entitas Nirlaba (ISAK 35 / PSAK 45)"
          periodeLabel={`Per 30 ${periodeBerjalanLabel} (Dinyatakan dalam Rupiah)`}
        />

        {/* Validasi Keseimbangan Khusus LPK */}
        {activeTab === 'LPK' && reportData?.summary && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center justify-between text-xs print:hidden ${
              reportData.summary.isSeimbang
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {reportData.summary.isSeimbang ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
              <span className="font-semibold">
                Status Neraca:{' '}
                {reportData.summary.isSeimbang
                  ? 'SEIMBANG (Balance)'
                  : 'BELUM SEIMBANG (Selisih)'}
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span>Total Aset: {formatIDR(reportData.summary.totalAset)}</span>
              <span>
                Liabilitas + Aset Neto:{' '}
                {formatIDR(reportData.summary.totalLiabilitasEkuitas)}
              </span>
              {!reportData.summary.isSeimbang && (
                <span className="font-bold underline">
                  Selisih: {formatIDR(reportData.summary.selisih)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content Tab Laporan */}
        {activeTab !== 'CALK' ? (
          <ReportTable
            rows={reportData?.rows || []}
            periodeBerjalanLabel={periodeBerjalanLabel}
            periodePembandingLabel={periodePembandingLabel}
            isLoading={isLoading}
          />
        ) : (
          <div className="space-y-6">
            {calkNotes?.length === 0 ? (
              <p className="text-center py-10 text-sm text-slate-500">
                Belum ada catatan CALK untuk periode ini.
              </p>
            ) : (
              calkNotes?.map((note: any) => (
                <div key={note.id} className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Catatan {note.nomor_catatan}: {note.judul}
                  </h3>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {note.isi}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tanda Tangan Pengesahan (Khusus Cetak / Print) */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-slate-500">Disusun Oleh,</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">Irvan</p>
            <p className="text-slate-500">Manager Keuangan & FINS</p>
          </div>
          <div>
            <p className="text-slate-500">Mengetahui & Menyetujui,</p>
            <div className="h-20" />
            <p className="font-bold text-slate-900 underline">Direktur Eksekutif</p>
            <p className="text-slate-500">LAZ Darul Hikam</p>
          </div>
        </div>
      </div>
    </div>
  );
}
