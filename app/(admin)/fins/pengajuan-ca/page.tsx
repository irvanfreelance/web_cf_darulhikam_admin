"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Plus, Minus, Upload, Download, Search, X, CheckCircle, XCircle,
  RotateCcw, Trash2, CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatNumber, parseNumber } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unapprove', label: 'Unapprove' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

type PengajuanRow = {
  id: number; id_buku: string; tanggal: string; coa_debet: string; coa_kredit: string;
  nama_akun: string; keterangan: string; quantity: number; nominal: string; realisasi: string;
  user_input: string; user_approve: string; status: 'unapprove' | 'approved' | 'rejected';
  office_id: number; office_nama: string; sumber_dana: string; department_id: number | null;
};

type DetailLine = { key: string; coa: string; namaAkun: string; quantity: number; nominal: number; keterangan: string };

const emptyHeader = () => ({
  officeId: 1 as number,
  departmentId: null as number | null,
  sumberDana: '',
  tanggal: nowLocal(),
  backDate: false,
});
const emptyDraftLine = () => ({ jenisTransaksi: '', nominal: '', keterangan: '' });

export default function PengajuanCAPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingIdBuku, setEditingIdBuku] = useState<string | null>(null);

  const [periodeFrom, setPeriodeFrom] = useState('2026-01-01');
  const [periodeTo, setPeriodeTo] = useState(new Date().toISOString().slice(0, 10));
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('unapprove');
  const [officeFilter, setOfficeFilter] = useState('1');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [header, setHeader] = useState(emptyHeader());
  const [draftLine, setDraftLine] = useState(emptyDraftLine());
  const [detailLines, setDetailLines] = useState<DetailLine[]>([]);
  const [saving, setSaving] = useState(false);

  const queryParams = new URLSearchParams({
    periodeFrom, periodeTo, keyword, status: statusFilter, officeId: officeFilter,
  });
  const { data: records, isLoading, mutate } = useSWR<PengajuanRow[]>(
    `/api/fins/pengajuan-ca?${queryParams.toString()}`,
    fetcher
  );

  const rows = records || [];
  const totalNominal = rows.reduce((s, r) => s + Number(r.nominal) * r.quantity, 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const jenisOptions = (masters?.jenisTransaksi || []).map((j: any) => ({ id: j.coa, name: j.nama }));
  const officeOptions = (masters?.offices || []).map((o: any) => ({ id: o.id, name: o.nama }));
  const departmentOptions = (masters?.jabatan || []).map((p: any) => ({ id: p.id, name: p.nama }));
  const sumberDanaOptions = (masters?.sumberDana || []).map((s: any) => ({ id: s.nama, name: s.nama }));

  const levelApprove = masters?.levelApprove || [];
  const levelLabel = levelApprove.length > 0
    ? levelApprove.map((l: any) =>
        `${fmt(Number(l.expend_min))} < Nominal <= ${l.expend_max != null ? fmt(Number(l.expend_max)) : 'Tak Terbatas'}`
      ).join(' | ')
    : '';

  const commitSearch = () => { setKeyword(keywordDraft); setPage(1); };

  const handleApprove = async (id: number) => {
    const res = await fetch(`/api/fins/pengajuan-ca/line/${id}/approve`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || 'Gagal approve pengajuan');
      return;
    }
    toast.success('Pengajuan disetujui');
    mutate();
  };
  const handleReject = async (id: number) => {
    if (!window.confirm('Tolak pengajuan CA ini?')) return;
    await fetch(`/api/fins/pengajuan-ca/line/${id}/approve`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }),
    });
    toast.success('Pengajuan ditolak');
    mutate();
  };
  const handleSetUnapprove = async (id: number) => {
    await fetch(`/api/fins/pengajuan-ca/line/${id}/approve`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unapprove' }),
    });
    mutate();
  };
  const handleApproveAll = async () => {
    const targets = rows.filter(r => r.status === 'unapprove');
    if (targets.length === 0) { toast.error('Tidak ada pengajuan Unapprove pada tampilan saat ini.'); return; }
    if (!window.confirm(`Approve ${targets.length} pengajuan CA?`)) return;
    const res = await fetch('/api/fins/pengajuan-ca/approve-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodeFrom, periodeTo, keyword, officeId: officeFilter }),
    });
    const data = await res.json();
    toast.success(`${data.approved} pengajuan disetujui${data.skipped ? `, ${data.skipped} dilewati (melebihi batas approval)` : ''}`);
    mutate();
  };
  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Hapus pengajuan ini?')) return;
    await fetch(`/api/fins/pengajuan-ca/line/${id}`, { method: 'DELETE' });
    mutate();
  };

  const openAdd = () => {
    setEditingIdBuku(null);
    setHeader(emptyHeader());
    setDetailLines([]);
    setDraftLine(emptyDraftLine());
    setView('form');
  };

  const openEdit = async (idBuku: string) => {
    const res = await fetch(`/api/fins/pengajuan-ca/${idBuku}`);
    const lines: PengajuanRow[] = await res.json();
    if (lines.length === 0) return;
    const first = lines[0];
    setEditingIdBuku(idBuku);
    setHeader({
      officeId: first.office_id,
      departmentId: first.department_id,
      sumberDana: first.sumber_dana || '',
      tanggal: `${first.tanggal.slice(0, 10)}T09:00`,
      backDate: true,
    });
    setDetailLines(lines.map(l => ({
      key: String(l.id), coa: l.coa_debet, namaAkun: l.nama_akun, quantity: l.quantity,
      nominal: Number(l.nominal), keterangan: l.keterangan,
    })));
    setDraftLine(emptyDraftLine());
    setView('form');
  };

  const addDetailLine = () => {
    if (!draftLine.jenisTransaksi || !draftLine.nominal) {
      toast.error('Pilih Jenis Transaksi dan isi Nominal terlebih dahulu.');
      return;
    }
    const jt = (masters?.jenisTransaksi || []).find((j: any) => j.nama === draftLine.jenisTransaksi);
    setDetailLines(prev => [...prev, {
      key: `draft-${Date.now()}-${Math.random()}`,
      coa: jt?.coa || '',
      namaAkun: draftLine.jenisTransaksi,
      quantity: 1,
      nominal: parseNumber(draftLine.nominal),
      keterangan: draftLine.keterangan,
    }]);
    setDraftLine(emptyDraftLine());
  };
  const clearDraftLine = () => setDraftLine(emptyDraftLine());
  const removeDetailLine = (key: string) => setDetailLines(prev => prev.filter(l => l.key !== key));

  const persistLines = async () => {
    if (detailLines.length === 0) {
      toast.error('Tambahkan minimal satu baris Detail Pengajuan.');
      return false;
    }
    setSaving(true);
    try {
      const payload = {
        header: {
          officeId: header.officeId,
          sumberDana: header.sumberDana,
          departmentId: header.departmentId,
          tanggal: header.tanggal,
          bankAccount: '101.01.001.000',
        },
        lines: detailLines.map(l => ({ key: l.key.startsWith('draft-') ? undefined : l.key, coa: l.coa, namaAkun: l.namaAkun, quantity: l.quantity, nominal: l.nominal, keterangan: l.keterangan })),
      };
      const res = editingIdBuku
        ? await fetch(`/api/fins/pengajuan-ca/${editingIdBuku}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/fins/pengajuan-ca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Gagal menyimpan pengajuan');
        return false;
      }
      toast.success('Pengajuan CA tersimpan');
      mutate();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndTambah = async () => {
    if (!(await persistLines())) return;
    setEditingIdBuku(null);
    setHeader(emptyHeader());
    setDetailLines([]);
    setDraftLine(emptyDraftLine());
  };
  const handleSave = async () => {
    if (!(await persistLines())) return;
    setView('list');
  };
  const handleCancel = () => setView('list');

  if (view === 'form') {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Pengajuan CA</h1>
          <p className="text-sm text-slate-400">{editingIdBuku ? `Ubah pengajuan ${editingIdBuku}` : 'Ajukan Cash Advance (CA) baru'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-amber-600 text-white px-6 py-3 font-bold">Pengajuan Cash Advance (CA)</div>
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Informasi Pengajuan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kantor</label>
                <SearchableSelect options={officeOptions} value={header.officeId} onChange={val => setHeader(prev => ({ ...prev, officeId: Number(val) }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Tanggal {!header.backDate && (
                    <button type="button" className="text-rose-500 text-xs ml-1.5" onClick={() => setHeader(prev => ({ ...prev, backDate: true }))}>Back Date</button>
                  )}
                </label>
                <input type="datetime-local" disabled={!header.backDate} value={header.tanggal}
                  onChange={e => setHeader(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm text-slate-900 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department</label>
                <SearchableSelect options={departmentOptions} value={header.departmentId ?? ''} onChange={val => setHeader(prev => ({ ...prev, departmentId: val ? Number(val) : null }))} placeholder="Jabatan" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sumber Dana</label>
                <SearchableSelect options={sumberDanaOptions} value={header.sumberDana} onChange={val => setHeader(prev => ({ ...prev, sumberDana: String(val) }))} placeholder="Sumber Dana" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-700 mt-8 mb-4">Detail Pengajuan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Jenis Transaksi</label>
                <SearchableSelect options={jenisOptions} value={draftLine.jenisTransaksi} onChange={val => setDraftLine(prev => ({ ...prev, jenisTransaksi: String(val) }))} placeholder="Jenis Transaksi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nominal</label>
                <input type="text" inputMode="numeric" placeholder="Nominal" value={draftLine.nominal ? formatNumber(draftLine.nominal) : ''}
                  onChange={e => setDraftLine(prev => ({ ...prev, nominal: String(parseNumber(e.target.value)) }))}
                  className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Keterangan</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Keterangan" value={draftLine.keterangan}
                    onChange={e => setDraftLine(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm text-slate-900" />
                  <button type="button" title="Tambah Baris" onClick={addDetailLine} className="shrink-0 h-12 w-12 rounded-xl bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700"><Plus size={16} /></button>
                  <button type="button" title="Kosongkan" onClick={clearDraftLine} className="shrink-0 h-12 w-12 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50"><Minus size={16} /></button>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">COA</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Nama Akun</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Quantity</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Nominal Satuan</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Total Nominal</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Keterangan</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Kantor</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detailLines.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-slate-400 py-6">Belum ada baris detail</td></tr>
                  )}
                  {detailLines.map(l => (
                    <tr key={l.key}>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{l.coa}</td>
                      <td className="px-3 py-2.5">{l.namaAkun}</td>
                      <td className="px-3 py-2.5 text-center">{l.quantity}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(l.nominal)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{fmt(l.nominal * l.quantity)}</td>
                      <td className="px-3 py-2.5">{l.keterangan || '-'}</td>
                      <td className="px-3 py-2.5">{officeOptions.find((o: any) => o.id === header.officeId)?.name}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => removeDetailLine(l.key)} title="Hapus baris"><Trash2 size={16} className="text-rose-500" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {detailLines.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={4} className="px-3 py-2.5 text-right">Total:</td>
                      <td className="px-3 py-2.5 text-right">{fmt(detailLines.reduce((s, l) => s + l.nominal * l.quantity, 0))}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50"><X size={16} /> Cancel</button>
              <button onClick={handleSaveAndTambah} disabled={saving} className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">Save & Tambah</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Pengajuan</h1>
        <p className="text-sm text-slate-400">Daftar pengajuan Cash Advance (CA) beserta status approval dan realisasi pertanggungjawaban</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500">Periode:</span>
        <input type="date" value={periodeFrom} onChange={e => setPeriodeFrom(e.target.value)} className="h-10 rounded-xl border border-slate-100 bg-white px-3 text-sm" />
        <span className="text-xs text-slate-400">s/d</span>
        <input type="date" value={periodeTo} onChange={e => setPeriodeTo(e.target.value)} className="h-10 rounded-xl border border-slate-100 bg-white px-3 text-sm" />
        <div className="flex items-center gap-2 h-10 rounded-xl border border-slate-100 bg-white px-3 w-[220px]">
          <Search size={15} className="text-slate-400" />
          <input type="text" placeholder="Keyword..." value={keywordDraft} onChange={e => setKeywordDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()} className="w-full text-sm outline-none" />
        </div>
        <button onClick={commitSearch} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50"><Search size={15} /> Search</button>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-100 bg-white px-3 text-sm">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={officeFilter} onChange={e => { setOfficeFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-100 bg-white px-3 text-sm">
            <option value="all">Semua Kantor</option>
            {officeOptions.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={openAdd} className="h-10 px-4 rounded-xl bg-amber-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-amber-700"><Plus size={16} /> Tambah</button>
        <label className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 cursor-pointer hover:bg-slate-50">
          <Upload size={16} /> Import
          <input type="file" accept=".csv,.xlsx" className="hidden" onChange={() => toast.info('Import belum tersedia.')} />
        </label>
        <button onClick={() => toast.info('Export belum tersedia.')} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50"><Download size={16} /> Export</button>

        <div className="ml-auto flex items-center gap-3">
          {levelLabel && <span className="text-xs font-semibold text-rose-500">Level Approve [{levelLabel}]</span>}
          <button onClick={handleApproveAll} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700"><CheckCheck size={16} /> Approve All</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="font-bold text-slate-700 px-5 pt-4 pb-3">Daftar Pengajuan</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                <th className="px-4 py-2.5 text-left font-semibold">Tanggal</th>
                <th className="px-4 py-2.5 text-left font-semibold">ID Buku</th>
                <th className="px-4 py-2.5 text-left font-semibold">Nama Akun</th>
                <th className="px-4 py-2.5 text-left font-semibold">Keterangan</th>
                <th className="px-4 py-2.5 text-center font-semibold">Quantity</th>
                <th className="px-4 py-2.5 text-right font-semibold">Nominal</th>
                <th className="px-4 py-2.5 text-right font-semibold">Realisasi</th>
                <th className="px-4 py-2.5 text-left font-semibold">Pengaju</th>
                <th className="px-4 py-2.5 text-left font-semibold">Approver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={10} className="text-center text-slate-400 py-8">Memuat data...</td></tr>
              )}
              {!isLoading && paged.length === 0 && (
                <tr><td colSpan={10} className="text-center text-slate-400 py-8">Belum ada data</td></tr>
              )}
              {paged.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      {r.status !== 'approved' && <button title="Approve" onClick={() => handleApprove(r.id)}><CheckCircle size={16} className="text-emerald-600" /></button>}
                      {r.status !== 'rejected' && <button title="Reject" onClick={() => handleReject(r.id)}><XCircle size={16} className="text-rose-500" /></button>}
                      {r.status !== 'unapprove' && <button title="Set Unapprove" onClick={() => handleSetUnapprove(r.id)}><RotateCcw size={16} className="text-slate-500" /></button>}
                      <button title="Hapus" onClick={() => handleDeleteRecord(r.id)}><Trash2 size={16} className="text-rose-500" /></button>
                    </div>
                    <span className={
                      r.status === 'approved' ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600'
                      : r.status === 'rejected' ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600'
                      : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600'
                    }>
                      {r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'UnApprove'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{r.tanggal.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => openEdit(r.id_buku)} className="text-amber-600 font-mono text-xs hover:underline">{r.id_buku}</button>
                  </td>
                  <td className="px-4 py-2.5">{r.nama_akun}</td>
                  <td className="px-4 py-2.5">{r.keterangan || '-'}</td>
                  <td className="px-4 py-2.5 text-center">{r.quantity}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(Number(r.nominal) * r.quantity)}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(Number(r.realisasi))}</td>
                  <td className="px-4 py-2.5">{r.user_input}</td>
                  <td className="px-4 py-2.5">{r.user_approve || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={6} className="px-4 py-2.5 text-right">&Sigma; Total :</td>
                <td className="px-4 py-2.5 text-right">{fmt(totalNominal)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 flex items-center justify-between border-t border-slate-100 text-xs text-slate-500">
          <span>Displaying {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, rows.length)} of {rows.length} items</span>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setPage(1)} className="disabled:opacity-40">&laquo;</button>
            <button disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="disabled:opacity-40">&lsaquo;</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="disabled:opacity-40">&rsaquo;</button>
            <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} className="disabled:opacity-40">&raquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
