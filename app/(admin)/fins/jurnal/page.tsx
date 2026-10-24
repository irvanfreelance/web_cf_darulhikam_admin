"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Search, X, RotateCcw, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Pagination } from '@/components/shared/pagination';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const todayStr  = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

type Row = {
  id: number;
  id_jurnal: string;
  id_trans: string;
  id_exre: string;
  tgl_exre: string;
  jenis: string;
  coa: string;
  nama_coa: string;
  debet: string;
  kredit: string;
  keterangan: string;
  nik_input: string;
  noresi: string;
  coa_buku: string;
  nama_coa_buku: string;
  nama_kantor: string;
};

export default function JurnalPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [periodeFrom, setPeriodeFrom] = useState(yearStart());
  const [periodeTo, setPeriodeTo]     = useState(todayStr());
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword]           = useState('');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [coaFilter, setCoaFilter]       = useState('');
  const [jenisFilter, setJenisFilter]   = useState('all');
  const [showAdvance, setShowAdvance]   = useState(false);
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(25);
  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    periodeFrom, periodeTo,
    ...(keyword ? { keyword } : {}),
    ...(coaFilter ? { coa: coaFilter } : {}),
    officeId: officeFilter,
    jenis: jenisFilter,
    limit: String(limit),
    offset: String(offset),
  });

  const { data, isLoading } = useSWR(`/api/fins/jurnal?${params}`, fetcher);
  const rows: Row[]    = data?.rows || [];
  const total: number  = data?.total || 0;
  const totalDebet     = data?.totalDebet || 0;
  const totalKredit    = data?.totalKredit || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offices: { id: number; nama: string }[] = masters?.offices || [];

  const commitSearch = () => { setKeyword(keywordDraft); setPage(1); };
  const clearFilters = () => {
    setPeriodeFrom(yearStart()); setPeriodeTo(todayStr());
    setKeywordDraft(''); setKeyword(''); setCoaFilter('');
    setOfficeFilter('all'); setJenisFilter('all');
    setPage(1);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['Tanggal','ID Jurnal','ID Trans','ID Buku','COA','Nama COA','Debet','Kredit','COA Buku','Keterangan','Jenis','No Resi','User Input','Kantor'];
    const csvRows = rows.map((r) => [
      r.tgl_exre, r.id_jurnal, r.id_trans, r.id_exre,
      r.coa, r.nama_coa, r.debet, r.kredit, r.coa_buku,
      r.keterangan, r.jenis, r.noresi, r.nik_input, r.nama_kantor,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap-jurnal-${todayStr()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Rekap Jurnal</h1>
        <p className="text-xs text-slate-400 mt-0.5">Entri jurnal double-entry dari seluruh transaksi keuangan</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entri', value: total, color: 'text-slate-800', bg: 'bg-white' },
          { label: 'Σ Debet', value: fmt(totalDebet), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Σ Kredit', value: fmt(totalKredit), color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl border border-slate-100 px-5 py-4`}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input type="date" value={periodeFrom}
              onChange={(e) => { setPeriodeFrom(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none" />
            <span className="text-slate-300">–</span>
            <input type="date" value={periodeTo}
              onChange={(e) => { setPeriodeTo(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none" />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 flex-1 min-w-[200px]">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input type="text" value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
              placeholder="Cari ID Jurnal, ID Buku, COA, keterangan..."
              className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full" />
            {keywordDraft && (
              <button onClick={() => { setKeywordDraft(''); setKeyword(''); setPage(1); }}>
                <X size={12} className="text-slate-400" />
              </button>
            )}
          </div>
          <button onClick={commitSearch}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
            Cari
          </button>
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => setShowAdvance((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${showAdvance ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={13} /> Filter {showAdvance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {showAdvance && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <select value={officeFilter} onChange={(e) => { setOfficeFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none">
              <option value="all">Semua Kantor</option>
              {offices.map((o) => <option key={o.id} value={String(o.id)}>{o.nama}</option>)}
            </select>
            <select value={jenisFilter} onChange={(e) => { setJenisFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none">
              <option value="all">Semua Jenis</option>
              <option value="e">Pengeluaran (e)</option>
              <option value="r">Penerimaan (r)</option>
            </select>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 min-w-[160px]">
              <span className="text-xs text-slate-400 shrink-0">COA:</span>
              <input type="text" value={coaFilter}
                onChange={(e) => { setCoaFilter(e.target.value); setPage(1); }}
                placeholder="e.g. 101.10"
                className="bg-transparent text-xs text-slate-700 outline-none w-full" />
            </div>
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-slate-50/50">
                {['TANGGAL','ID JURNAL','ID BUKU','COA','NAMA COA','DEBET','KREDIT','COA LAWAN','KETERANGAN','JENIS','USER INPUT','KANTOR'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap ${['DEBET','KREDIT'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
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
                        Tidak ada entri jurnal pada periode ini
                      </td>
                    </tr>
                  )
                : rows.map((row) => {
                    const isDebet = Number(row.debet) > 0;
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isDebet ? 'bg-blue-50/10' : 'bg-purple-50/10'}`}>
                        <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap text-slate-600">{row.tgl_exre?.slice(0,10) || '—'}</td>
                        <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-slate-500">{row.id_jurnal}</span>
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 whitespace-nowrap">
                          <span className="font-mono text-blue-600 font-medium">{row.id_exre || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 font-mono whitespace-nowrap text-slate-600">{row.coa}</td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-slate-700 max-w-[160px] truncate" title={row.nama_coa}>{row.nama_coa || '—'}</td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-right font-medium text-blue-700 whitespace-nowrap">
                          {Number(row.debet) > 0 ? fmt(Number(row.debet)) : '—'}
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-right font-medium text-purple-700 whitespace-nowrap">
                          {Number(row.kredit) > 0 ? fmt(Number(row.kredit)) : '—'}
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 font-mono whitespace-nowrap text-slate-500 text-[11px]">
                          {row.coa_buku || '—'}
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-slate-600 max-w-[200px] truncate" title={row.keterangan}>{row.keterangan || '—'}</td>
                        <td className="px-4 py-2.5 border-b border-slate-50">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.jenis === 'e' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {row.jenis === 'e' ? 'Pengeluaran' : 'Penerimaan'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-slate-500 whitespace-nowrap">{row.nik_input || '—'}</td>
                        <td className="px-4 py-2.5 border-b border-slate-50 text-slate-500 whitespace-nowrap">{row.nama_kantor || '—'}</td>
                      </tr>
                    );
                  })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/80">
                  <td colSpan={5} className="px-4 py-3 border-t border-slate-200 text-xs font-semibold text-slate-600">Σ Total</td>
                  <td className="px-4 py-3 border-t border-slate-200 text-right text-xs font-bold text-blue-700">{fmt(totalDebet)}</td>
                  <td className="px-4 py-3 border-t border-slate-200 text-right text-xs font-bold text-purple-700">{fmt(totalKredit)}</td>
                  <td colSpan={5} className="border-t border-slate-200" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <Pagination
            currentPage={page} totalPages={totalPages} totalCount={total}
            offset={offset} limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
