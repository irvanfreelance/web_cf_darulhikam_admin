"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Plus, Minus, Upload, Download, Search, X, CheckCircle, XCircle,
  RotateCcw, Trash2, CheckCheck, ArrowLeft, Save, Pencil, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Pagination } from '@/components/shared/pagination';
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
  { value: 'us', label: 'Unapprove' },
  { value: 'rs', label: 'Rejected' },
  { value: 'as', label: 'Approved' },
];

type PengajuanRow = {
  id: number; id_buku: string; tanggal: string; coa_debet: string; coa_kredit: string;
  nama_akun: string; keterangan: string; quantity: number; nominal: string; realisasi: string;
  user_input: string; user_approve: string; approve: 'us' | 'as' | 'rs' | 'u' | 'a' | 'r';
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

const STATUS_BADGE: Record<string, string> = {
  as: 'bg-emerald-50 text-emerald-600',
  a: 'bg-emerald-50 text-emerald-600',
  rs: 'bg-rose-50 text-rose-600',
  r: 'bg-rose-50 text-rose-600',
  us: 'bg-amber-50 text-amber-600',
};
const STATUS_TEXT: Record<string, string> = {
  as: 'Approved', a: 'Approved (Cair)', rs: 'Rejected', r: 'Rejected', us: 'UnApprove',
};

export default function PengajuanCAPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingIdBuku, setEditingIdBuku] = useState<string | null>(null);

  const [periodeFrom, setPeriodeFrom] = useState('2026-01-01');
  const [periodeTo, setPeriodeTo] = useState(new Date().toISOString().slice(0, 10));
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('us');
  const [officeFilter, setOfficeFilter] = useState('1');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const [header, setHeader] = useState(emptyHeader());
  const [draftLine, setDraftLine] = useState(emptyDraftLine());
  const [detailLines, setDetailLines] = useState<DetailLine[]>([]);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
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
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * limit, currentPage * limit);

  const jenisOptions = (masters?.jenisTransaksi || []).map((j: { coa: string; nama: string }) => ({ id: j.coa, name: j.nama }));
  const officeOptions = (masters?.offices || []).map((o: { id: number; nama: string }) => ({ id: o.id, name: o.nama }));
  const departmentOptions = (masters?.jabatan || []).map((p: { id: number; nama: string }) => ({ id: p.id, name: p.nama }));
  const sumberDanaOptions = (masters?.sumberDana || []).map((s: { nama: string }) => ({ id: s.nama, name: s.nama }));

  const levelApprove = masters?.levelApprove || [];
  const levelLabel = levelApprove.length > 0
    ? levelApprove.map((l: { expend_min: string; expend_max: string | null }) =>
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
    toast('Tolak pengajuan CA ini?', {
      action: {
        label: 'Tolak',
        onClick: async () => {
          await fetch(`/api/fins/pengajuan-ca/line/${id}/approve`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }),
          });
          toast.success('Pengajuan ditolak');
          mutate();
        },
      },
    });
  };
  const handleSetUnapprove = async (id: number) => {
    await fetch(`/api/fins/pengajuan-ca/line/${id}/approve`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unapprove' }),
    });
    mutate();
  };
  const handleApproveAll = async () => {
    const targets = rows.filter(r => r.approve === 'us');
    if (targets.length === 0) { toast.error('Tidak ada pengajuan Unapprove pada tampilan saat ini.'); return; }
    toast(`Approve ${targets.length} pengajuan CA?`, {
      action: {
        label: 'Approve',
        onClick: async () => {
          const res = await fetch('/api/fins/pengajuan-ca/approve-all', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periodeFrom, periodeTo, keyword, officeId: officeFilter }),
          });
          const data = await res.json();
          toast.success(`${data.approved} pengajuan disetujui${data.skipped ? `, ${data.skipped} dilewati (melebihi batas approval)` : ''}`);
          mutate();
        },
      },
    });
  };
  const handleDeleteRecord = (id: number) => {
    toast('Hapus pengajuan ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          await fetch(`/api/fins/pengajuan-ca/line/${id}`, { method: 'DELETE' });
          toast.success('Pengajuan dihapus');
          mutate();
        },
      },
    });
  };

  const openAdd = () => {
    setEditingIdBuku(null);
    setHeader(emptyHeader());
    setDetailLines([]);
    setDraftLine(emptyDraftLine());
    setEditingLineKey(null);
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
    setEditingLineKey(null);
    setView('form');
  };

  const addDetailLine = () => {
    if (!draftLine.jenisTransaksi || !draftLine.nominal) {
      toast.error('Pilih Jenis Transaksi dan isi Nominal terlebih dahulu.');
      return;
    }
    // draftLine.jenisTransaksi holds the COA code (SearchableSelect reports
    // the selected option's `id`, not its `name`) — look up the name by coa.
    const jt = (masters?.jenisTransaksi || []).find((j: { coa: string; nama: string }) => j.coa === draftLine.jenisTransaksi);

    if (editingLineKey) {
      // Update the existing line in place, keeping its key (and, if it's a
      // persisted line, its `realisasi`/id) so PUT correctly matches it up
      // instead of dropping history via delete-then-recreate.
      setDetailLines(prev => prev.map(l => l.key === editingLineKey
        ? { ...l, coa: jt?.coa || draftLine.jenisTransaksi, namaAkun: jt?.nama || draftLine.jenisTransaksi, nominal: parseNumber(draftLine.nominal), keterangan: draftLine.keterangan }
        : l
      ));
      setEditingLineKey(null);
    } else {
      setDetailLines(prev => [...prev, {
        key: `draft-${Date.now()}-${Math.random()}`,
        coa: jt?.coa || draftLine.jenisTransaksi,
        namaAkun: jt?.nama || draftLine.jenisTransaksi,
        quantity: 1,
        nominal: parseNumber(draftLine.nominal),
        keterangan: draftLine.keterangan,
      }]);
    }
    setDraftLine(emptyDraftLine());
  };
  const clearDraftLine = () => { setDraftLine(emptyDraftLine()); setEditingLineKey(null); };
  const startEditLine = (line: DetailLine) => {
    setEditingLineKey(line.key);
    setDraftLine({ jenisTransaksi: line.coa, nominal: String(line.nominal), keterangan: line.keterangan });
  };
  const removeDetailLine = (key: string) => {
    setDetailLines(prev => prev.filter(l => l.key !== key));
    if (editingLineKey === key) { setEditingLineKey(null); setDraftLine(emptyDraftLine()); }
  };

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
    setEditingLineKey(null);
  };
  const handleSave = async () => {
    if (!(await persistLines())) return;
    setView('list');
  };
  const handleCancel = () => setView('list');

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 text-left">
          <button onClick={handleCancel} className="mt-1 p-2 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Pengajuan CA</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">{editingIdBuku ? `Ubah pengajuan ${editingIdBuku}` : 'Ajukan Cash Advance (CA) baru'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-semibold text-slate-800">Informasi Pengajuan</h2>
          </div>
          <div className="p-8 space-y-8 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Kantor</label>
                <SearchableSelect options={officeOptions} value={header.officeId} onChange={val => setHeader(prev => ({ ...prev, officeId: Number(val) }))} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                  Tanggal {!header.backDate && (
                    <button type="button" className="text-rose-500 normal-case font-semibold ml-1.5" onClick={() => setHeader(prev => ({ ...prev, backDate: true }))}>Back Date</button>
                  )}
                </label>
                <input type="datetime-local" disabled={!header.backDate} value={header.tanggal}
                  onChange={e => setHeader(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500 transition-all disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Department</label>
                <SearchableSelect options={departmentOptions} value={header.departmentId ?? ''} onChange={val => setHeader(prev => ({ ...prev, departmentId: val ? Number(val) : null }))} placeholder="Jabatan" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Sumber Dana</label>
                <SearchableSelect options={sumberDanaOptions} value={header.sumberDana} onChange={val => setHeader(prev => ({ ...prev, sumberDana: String(val) }))} placeholder="Sumber Dana" />
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-4">Detail Pengajuan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Jenis Transaksi</label>
                  <SearchableSelect options={jenisOptions} value={draftLine.jenisTransaksi} onChange={val => setDraftLine(prev => ({ ...prev, jenisTransaksi: String(val) }))} placeholder="Jenis Transaksi" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nominal</label>
                  <input type="text" inputMode="numeric" placeholder="Nominal" value={draftLine.nominal ? formatNumber(draftLine.nominal) : ''}
                    onChange={e => setDraftLine(prev => ({ ...prev, nominal: String(parseNumber(e.target.value)) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Keterangan</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Keterangan" value={draftLine.keterangan}
                      onChange={e => setDraftLine(prev => ({ ...prev, keterangan: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500 transition-all" />
                    <button type="button" title={editingLineKey ? 'Update Baris' : 'Tambah Baris'} onClick={addDetailLine} className={`shrink-0 h-[46px] w-[46px] rounded-xl text-white flex items-center justify-center transition-all active:scale-95 shadow-lg ${editingLineKey ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'}`}>
                      {editingLineKey ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                    </button>
                    <button type="button" title="Kosongkan" onClick={clearDraftLine} className="shrink-0 h-[46px] w-[46px] rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-all"><Minus size={16} /></button>
                  </div>
                  {editingLineKey && (
                    <p className="text-xs text-amber-600 font-medium mt-2">Mengubah baris — klik &lsquo;centang&rsquo; untuk menyimpan perubahan.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-xs font-medium">
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal">COA</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal">Nama Akun</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal text-center">Quantity</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal text-right">Nominal Satuan</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal text-right">Total Nominal</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal">Keterangan</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal">Kantor</th>
                        <th className="px-5 py-3.5 border-b border-slate-100 font-normal text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailLines.length === 0 && (
                        <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 italic">Belum ada baris detail</td></tr>
                      )}
                      {detailLines.map(l => (
                        <tr key={l.key} className={`transition-colors ${editingLineKey === l.key ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-5 py-4 font-mono text-xs text-slate-500">{l.coa}</td>
                          <td className="px-5 py-4 text-sm font-normal text-slate-800">{l.namaAkun}</td>
                          <td className="px-5 py-4 text-center text-sm text-slate-600">{l.quantity}</td>
                          <td className="px-5 py-4 text-right text-sm text-slate-600">{fmt(l.nominal)}</td>
                          <td className="px-5 py-4 text-right text-sm font-normal text-slate-800">{fmt(l.nominal * l.quantity)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{l.keterangan || '-'}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{officeOptions.find((o: { id: number; name: string }) => o.id === header.officeId)?.name}</td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditLine(l)} title="Ubah baris" className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors"><Pencil size={16} /></button>
                              <button onClick={() => removeDetailLine(l.key)} title="Hapus baris" className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {detailLines.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50/50">
                          <td colSpan={4} className="px-5 py-3.5 text-right text-sm font-semibold text-slate-700">Total:</td>
                          <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(detailLines.reduce((s, l) => s + l.nominal * l.quantity, 0))}</td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={handleCancel} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <X size={18} /> Cancel
              </button>
              <button onClick={handleSaveAndTambah} disabled={saving} className="flex items-center gap-2 bg-white border border-teal-200 text-teal-700 px-6 py-3 rounded-xl text-sm font-medium hover:bg-teal-50 transition-all active:scale-95 disabled:opacity-60">
                <Plus size={18} /> Save & Tambah
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-60">
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Pengajuan CA</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Daftar pengajuan Cash Advance (CA) beserta status approval dan realisasi pertanggungjawaban</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <Upload size={18} /> Import
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={() => toast.info('Import belum tersedia.')} />
          </label>
          <button onClick={() => toast.info('Export belum tersedia.')} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={18} /> Export
          </button>
          <button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95 shrink-0">
            <Plus size={18} strokeWidth={3} /> Tambah
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center text-left">
        <span className="text-xs font-semibold text-slate-500">Periode:</span>
        <input type="date" value={periodeFrom} onChange={e => setPeriodeFrom(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
        <span className="text-xs text-slate-400">s/d</span>
        <input type="date" value={periodeTo} onChange={e => setPeriodeTo(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />

        <div className="relative flex-1 min-w-[220px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input type="text" placeholder="Cari ID buku, akun, atau keterangan..." value={keywordDraft}
            onChange={e => setKeywordDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
        </div>
        <button onClick={commitSearch} className="px-5 py-2.5 rounded-xl border border-slate-100 bg-white text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <Search size={16} /> Cari
        </button>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50">
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={officeFilter} onChange={e => { setOfficeFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50">
          <option value="all">Semua Kantor</option>
          {officeOptions.map((o: { id: number; name: string }) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Level Approve + Approve All */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {levelLabel ? (
          <span className="text-xs font-semibold text-rose-500">Level Approve [{levelLabel}]</span>
        ) : <span />}
        <button onClick={handleApproveAll} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-teal-500/20 active:scale-95">
          <CheckCheck size={18} /> Approve All
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-medium">
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Action</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Tanggal</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">ID Buku</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Nama Akun</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Keterangan</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-center">Qty</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-right">Nominal</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-right">Realisasi</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Pengaju</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Approver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={10} className="h-16 px-6 py-4"></td></tr>)
              ) : paged.length > 0 ? (
                paged.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 mb-1.5">
                        {r.approve !== 'as' && r.approve !== 'a' && <button title="Approve" onClick={() => handleApprove(r.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"><CheckCircle size={16} /></button>}
                        {r.approve !== 'rs' && r.approve !== 'r' && <button title="Reject" onClick={() => handleReject(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><XCircle size={16} /></button>}
                        {r.approve !== 'us' && <button title="Set Unapprove" onClick={() => handleSetUnapprove(r.id)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"><RotateCcw size={16} /></button>}
                        <button title="Ubah Pengajuan" onClick={() => openEdit(r.id_buku)} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors"><Pencil size={16} /></button>
                        <button title="Hapus" onClick={() => handleDeleteRecord(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.approve]}`}>
                        {STATUS_TEXT[r.approve]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.tanggal.slice(0, 10)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(r.id_buku)} className="text-teal-600 font-mono text-xs hover:underline">{r.id_buku}</button>
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-800">{r.nama_akun}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-500">{r.keterangan || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">{r.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm font-normal text-slate-800">{fmt(Number(r.nominal) * r.quantity)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-500">{fmt(Number(r.realisasi))}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.user_input}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.user_approve || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data</td></tr>
              )}
            </tbody>
            {paged.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/50">
                  <td colSpan={6} className="px-6 py-3.5 text-right text-sm font-semibold text-slate-700">&Sigma; Total :</td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(totalNominal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        offset={offset}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        isLoading={isLoading}
      />
    </div>
  );
}
