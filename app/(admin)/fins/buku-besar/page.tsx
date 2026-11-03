"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { BookMarked, Download, Printer, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function BukuBesarPage() {
  const [selectedCoa, setSelectedCoa] = useState('');
  const [periodeFrom, setPeriodeFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [periodeTo, setPeriodeTo] = useState(new Date().toISOString().slice(0, 10));
  const [idKantor, setIdKantor] = useState('all');

  const { data: coaList } = useSWR<any[]>('/api/fins/coa', async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    return json?.rows || json || [];
  });

  const { data: kantorList } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  const queryParams = selectedCoa
    ? `coa=${selectedCoa}&periodeFrom=${periodeFrom}&periodeTo=${periodeTo}&idKantor=${idKantor}`
    : null;

  const { data, error, isLoading } = useSWR<any>(
    queryParams ? `/api/fins/buku-besar?${queryParams}` : null,
    jsonFetcher
  );

  const handleExport = () => {
    if (!data || !data.rows.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportRows = [
      {
        'Tanggal': periodeFrom,
        'No. Jurnal': '-',
        'Kode Akun': selectedCoa,
        'Keterangan': 'SALDO AWAL PERIODE',
        'Debet': 0,
        'Kredit': 0,
        'Saldo Berjalan': data.saldoAwal,
      },
      ...data.rows.map((r: any) => ({
        'Tanggal': r.tgl_exre ? r.tgl_exre.slice(0, 10) : '-',
        'No. Jurnal': r.id_jurnal,
        'Kode Akun': r.coa,
        'Keterangan': r.keterangan,
        'Debet': r.debet,
        'Kredit': r.kredit,
        'Saldo Berjalan': r.saldo_berjalan,
      })),
      {
        'Tanggal': periodeTo,
        'No. Jurnal': '-',
        'Kode Akun': selectedCoa,
        'Keterangan': 'TOTAL MUTASI & SALDO AKHIR',
        'Debet': data.totalDebet,
        'Kredit': data.totalKredit,
        'Saldo Berjalan': data.saldoAkhir,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Besar');
    XLSX.writeFile(workbook, `Buku_Besar_${selectedCoa}_${periodeFrom}_sd_${periodeTo}.xlsx`);
    toast.success('Buku besar berhasil diexport');
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Buku Besar (General Ledger)"
        description="Rincian mutasi akun buku besar dan kartu saldo berjalan untuk seluruh perkiraan COA"
      >
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
        >
          <Printer size={16} /> Cetak
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!data?.rows?.length}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50 print:hidden"
        >
          <Download size={16} /> Export Excel
        </button>
      </PageHeader>

      {/* Filter Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 rounded-2xl border border-slate-100 bg-white p-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Akun Buku Besar (COA) <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedCoa}
            onChange={(e) => setSelectedCoa(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">— Pilih Akun COA —</option>
            {(coaList || []).map((c: any) => (
              <option key={c.coa} value={c.coa}>
                {c.coa} - {c.nama_perkiraan} {c.parent === 'y' ? '(Induk)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={periodeFrom}
            onChange={(e) => setPeriodeFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={periodeTo}
            onChange={(e) => setPeriodeTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Kantor</label>
          <select
            value={idKantor}
            onChange={(e) => setIdKantor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Semua Kantor</option>
            {(kantorList || []).map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Ringkasan Saldo */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 mb-1">Saldo Awal</div>
            <div className="text-lg font-bold text-slate-800">{formatIDR(data.saldoAwal)}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-emerald-600 mb-1">Total Debet</div>
            <div className="text-lg font-bold text-emerald-700">+{formatIDR(data.totalDebet)}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-rose-600 mb-1">Total Kredit</div>
            <div className="text-lg font-bold text-rose-700">-{formatIDR(data.totalKredit)}</div>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 shadow-sm">
            <div className="text-xs font-semibold text-teal-700 mb-1">Saldo Akhir</div>
            <div className="text-lg font-bold text-teal-800">{formatIDR(data.saldoAkhir)}</div>
          </div>
        </div>
      )}

      {/* Tabel Rincian */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">ID Jurnal / Akun</th>
                <th className="px-4 py-3 font-medium">Uraian Transaksi</th>
                <th className="px-4 py-3 text-right font-medium">Debet</th>
                <th className="px-4 py-3 text-right font-medium">Kredit</th>
                <th className="px-4 py-3 text-right font-medium">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Memuat rincian buku besar...
                  </td>
                </tr>
              ) : !selectedCoa ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Silakan pilih akun buku besar (COA) di atas untuk melihat rincian.
                  </td>
                </tr>
              ) : data ? (
                <>
                  <tr className="bg-slate-50/60 font-medium">
                    <td className="px-4 py-2.5 text-xs text-slate-500">{periodeFrom}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-700 uppercase">
                      SALDO AWAL PERIODE
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-800">
                      {formatIDR(data.saldoAwal)}
                    </td>
                  </tr>

                  {data.rows.length ? (
                    data.rows.map((row: any) => (
                      <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {row.tgl_exre ? row.tgl_exre.slice(0, 10) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-800 whitespace-nowrap">
                          <div>{row.id_jurnal}</div>
                          <div className="text-[10px] text-teal-700 font-normal">{row.coa}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-sm">
                          <div>{row.keterangan}</div>
                          {row.id_exre && <div className="text-[10px] text-slate-400 font-mono">Ref: {row.id_exre}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {Number(row.debet) > 0 ? formatIDR(Number(row.debet)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-rose-700 whitespace-nowrap">
                          {Number(row.kredit) > 0 ? formatIDR(Number(row.kredit)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                          {formatIDR(Number(row.saldo_berjalan))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                        Tidak ada transaksi pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                </>
              ) : null}
            </tbody>
            {data && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right uppercase">Total Mutasi & Saldo Akhir:</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatIDR(data.totalDebet)}</td>
                  <td className="px-4 py-3 text-right text-rose-700">{formatIDR(data.totalKredit)}</td>
                  <td className="px-4 py-3 text-right text-teal-800">{formatIDR(data.saldoAkhir)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

