"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search, RotateCcw, Download, BookOpen } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const todayStr  = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

type Row = {
  id: number;
  id_jurnal: string;
  id_exre: string;
  tgl_exre: string;
  debet: string;
  kredit: string;
  saldo_berjalan: string;
  keterangan: string;
  nik_input: string;
  noresi: string;
  coa_buku: string;
  nama_coa_buku: string;
  nama_kantor: string;
  jenis: string;
};

type CoaInfo = { coa: string; nama_coa: string; saldo: 'd' | 'k' };

export default function BukuBesarPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [coa, setCoa]               = useState('');
  const [coaDraft, setCoaDraft]     = useState('');
  const [periodeFrom, setPeriodeFrom] = useState(yearStart());
  const [periodeTo, setPeriodeTo]     = useState(todayStr());
  const [officeFilter, setOfficeFilter] = useState('all');

  const offices: { id: number; nama: string }[] = masters?.offices || [];
  const coaAccounts: { coa: string; nama_coa: string }[] = masters?.coaAccounts || [];

  const params = coa
    ? new URLSearchParams({ coa, periodeFrom, periodeTo, officeId: officeFilter })
    : null;

  const { data, isLoading } = useSWR(
    params ? `/api/fins/buku-besar?${params}` : null,
    fetcher
  );

  const rows: Row[]        = data?.rows || [];
  const totalDebet         = data?.totalDebet || 0;
  const totalKredit        = data?.totalKredit || 0;
  const saldoAkhir         = data?.saldoAkhir || 0;
  const coaInfo: CoaInfo | null = data?.coaInfo || null;

  const handleSearch = () => {
    if (coaDraft) setCoa(coaDraft);
  };

  const clearFilters = () => {
    setCoa(''); setCoaDraft('');
    setPeriodeFrom(yearStart()); setPeriodeTo(todayStr());
    setOfficeFilter('all');
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['Tanggal','ID Jurnal','ID Buku','Keterangan','Debet','Kredit','Saldo Berjalan','COA Lawan','No Resi','User Input','Kantor'];
    const csvRows = rows.map((r) => [
      r.tgl_exre, r.id_jurnal, r.id_exre, r.keterangan,
      r.debet, r.kredit, r.saldo_berjalan, r.coa_buku,
      r.noresi, r.nik_input, r.nama_kantor,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `buku-besar-${coa}-${todayStr()}.csv`;
    a.click();
  };

  const saldoColor = saldoAkhir >= 0 ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Buku Besar</h1>
        <p className="text-xs text-slate-400 mt-0.5">Riwayat mutasi per akun COA dengan saldo berjalan</p>
      </div>

      {/* COA Selector + Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* COA search/select */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 flex-1">
              <BookOpen size={14} className="text-slate-400 shrink-0" />
              <input
                list="coa-list"
                type="text"
                value={coaDraft}
                onChange={(e) => setCoaDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Pilih atau ketik COA (e.g. 101.10.000.000)..."
                className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full" />
              <datalist id="coa-list">
                {coaAccounts.map((c) => (
                  <option key={c.coa} value={c.coa}>{c.coa} — {c.nama_coa}</option>
                ))}
              </datalist>
            </div>
            <button onClick={handleSearch}
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
              <Search size={13} />
            </button>
          </div>

          {/* Periode */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={periodeFrom}
              onChange={(e) => setPeriodeFrom(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none" />
            <span className="text-slate-300">–</span>
            <input type="date" value={periodeTo}
              onChange={(e) => setPeriodeTo(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none" />
          </div>

          <select value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none">
            <option value="all">Semua Kantor</option>
            {offices.map((o) => <option key={o.id} value={String(o.id)}>{o.nama}</option>)}
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
            {rows.length > 0 && (
              <button onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                <Download size={13} /> Export
              </button>
            )}
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* COA Info header */}
      {coaInfo && (
        <div className="bg-blue-600 rounded-xl px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-[10px] uppercase tracking-wide font-medium">Akun</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {coaInfo.coa} — {coaInfo.nama_coa}
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              Saldo Normal: {coaInfo.saldo === 'd' ? 'Debet' : 'Kredit'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-[10px] uppercase tracking-wide font-medium">Saldo Akhir</p>
            <p className={`text-xl font-bold mt-0.5 ${saldoAkhir >= 0 ? 'text-white' : 'text-rose-300'}`}>
              {fmt(Math.abs(saldoAkhir))}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {coaInfo && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Entri', value: rows.length, color: 'text-slate-800', bg: 'bg-white' },
            { label: 'Σ Debet',  value: fmt(totalDebet),  color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Σ Kredit', value: fmt(totalKredit), color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((c) => (
            <div key={c.label} className={`${c.bg} rounded-xl border border-slate-100 px-5 py-4`}>
              <p className="text-xs text-slate-400 mb-1">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* No COA selected state */}
      {!coa && (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center justify-center text-slate-300 gap-3">
          <BookOpen size={40} strokeWidth={1} />
          <p className="text-sm">Pilih COA untuk menampilkan buku besar</p>
        </div>
      )}

      {/* Table */}
      {coa && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr className="bg-slate-50/50">
                  {['TANGGAL','ID JURNAL','ID BUKU','KETERANGAN','DEBET','KREDIT','SALDO','COA LAWAN','NAMA COA LAWAN','NO RESI','USER INPUT','KANTOR'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap ${['DEBET','KREDIT','SALDO'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 12 }).map((__, j) => (
                          <td key={j} className="px-4 py-3 border-b border-slate-50"><div className="h-3 bg-slate-100 rounded" /></td>
                        ))}
                      </tr>
                    ))
                  : rows.length === 0
                  ? (
                      <tr>
                        <td colSpan={12} className="text-center py-16 text-slate-400 text-sm">
                          Tidak ada mutasi pada COA dan periode ini
                        </td>
                      </tr>
                    )
                  : rows.map((row) => {
                      const saldo = Number(row.saldo_berjalan);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap text-slate-600">{row.tgl_exre?.slice(0,10) || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap">
                            <span className="font-mono text-[11px] text-slate-400">{row.id_jurnal}</span>
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap">
                            <span className="font-mono text-blue-600 font-medium">{row.id_exre || '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-slate-700 max-w-[200px] truncate" title={row.keterangan}>{row.keterangan || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-right font-medium text-blue-700 whitespace-nowrap">
                            {Number(row.debet) > 0 ? fmt(Number(row.debet)) : '—'}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-right font-medium text-purple-700 whitespace-nowrap">
                            {Number(row.kredit) > 0 ? fmt(Number(row.kredit)) : '—'}
                          </td>
                          <td className={`px-4 py-2.5 border-b border-slate-50 text-right font-bold whitespace-nowrap ${saldo >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            {fmt(Math.abs(saldo))}
                            {saldo < 0 && <span className="text-[9px] ml-1 font-normal">(K)</span>}
                          </td>
                          <td className="px-4 py-2.5 border-b border-slate-50 font-mono text-slate-400 text-[11px] whitespace-nowrap">{row.coa_buku || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-slate-600 max-w-[140px] truncate" title={row.nama_coa_buku}>{row.nama_coa_buku || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-slate-500 whitespace-nowrap">{row.noresi || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-slate-500 whitespace-nowrap">{row.nik_input || '—'}</td>
                          <td className="px-4 py-2.5 border-b border-slate-50 text-slate-500 whitespace-nowrap">{row.nama_kantor || '—'}</td>
                        </tr>
                      );
                    })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/80">
                    <td colSpan={4} className="px-4 py-3 border-t border-slate-200 text-xs font-semibold text-slate-600">Σ Total</td>
                    <td className="px-4 py-3 border-t border-slate-200 text-right text-xs font-bold text-blue-700">{fmt(totalDebet)}</td>
                    <td className="px-4 py-3 border-t border-slate-200 text-right text-xs font-bold text-purple-700">{fmt(totalKredit)}</td>
                    <td className={`px-4 py-3 border-t border-slate-200 text-right text-xs font-bold ${saldoColor}`}>{fmt(Math.abs(saldoAkhir))}</td>
                    <td colSpan={5} className="border-t border-slate-200" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
