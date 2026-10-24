"use client";

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Plus, Upload, Download, Search, X, CheckCircle, XCircle,
  RotateCcw, Trash2, ArrowLeft, Save, ChevronDown, ChevronUp,
  CheckCheck, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Pagination } from '@/components/shared/pagination';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const todayStr = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

const STATUS_BADGE: Record<string, string> = {
  as: 'bg-emerald-50 text-emerald-600',
  rs: 'bg-rose-50 text-rose-600',
  us: 'bg-amber-50 text-amber-600',
};
const STATUS_TEXT: Record<string, string> = {
  as: 'Approved', rs: 'Rejected', us: 'UnApprove',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'us', label: 'Unapprove' },
  { value: 'rs', label: 'Rejected' },
  { value: 'as', label: 'Approved' },
];

type Row = {
  id: number;
  id_buku: string;
  tanggal: string;
  nama_akun: string;
  keterangan: string;
  quantity: number;
  nominal: string;
  user_input: string;
  approve: 'us' | 'as' | 'rs';
  office_id: number;
  office_nama: string;
  coa_debet: string;
  coa_kredit: string;
  nama_akun_kredit: string;
  no_resi: string;
  referensi: string;
};

const emptyForm = () => ({
  tanggal: todayStr(),
  nama_akun: '',
  keterangan: '',
  quantity: 1,
  nominal: '',
  office_id: 1,
  coa_debet: '',
  coa_kredit: '',
  nama_akun_kredit: '',
  no_resi: '',
  referensi: '',
});

export default function PertanggungjawabanPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  /* ── Filters ── */
  const [periodeFrom, setPeriodeFrom] = useState(yearStart());
  const [periodeTo, setPeriodeTo] = useState(todayStr());
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [namaAkunFilter, setNamaAkunFilter] = useState('');
  const [showAdvance, setShowAdvance] = useState(false);
  const [coaFilter, setCoaFilter] = useState('');

  /* ── Pagination ── */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  /* ── Multi-select ── */
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const params = new URLSearchParams({
    periodeFrom, periodeTo,
    ...(keyword ? { keyword } : {}),
    status: statusFilter,
    officeId: officeFilter,
    ...(namaAkunFilter ? { namaAkun: namaAkunFilter } : {}),
    ...(coaFilter ? { coaDebet: coaFilter } : {}),
    limit: String(limit),
    offset: String(offset),
  });

  const { data, mutate, isLoading } = useSWR(
    `/api/fins/pertanggungjawaban?${params}`,
    fetcher
  );

  const rows: Row[] = data?.rows || [];
  const total: number = data?.total || 0;
  const grandTotal: number = data?.grandTotal || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ── Helpers ── */
  const commitSearch = () => { setKeyword(keywordDraft); setPage(1); };
  const clearFilters = () => {
    setPeriodeFrom(yearStart()); setPeriodeTo(todayStr());
    setKeywordDraft(''); setKeyword(''); setStatusFilter('all');
    setOfficeFilter('all'); setNamaAkunFilter(''); setCoaFilter('');
    setPage(1);
  };

  const setField = (k: keyof ReturnType<typeof emptyForm>, v: any) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const offices: { id: number; nama: string }[] = masters?.offices || [];
  const coaAccounts: { coa: string; nama: string }[] = masters?.coaAccounts || [];

  const coaOptions = coaAccounts.map((c: any) => ({ value: c.coa, label: `${c.coa} — ${c.nama}` }));

  /* ── Open form for new ── */
  const openNew = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setView('form');
  };

  /* ── Open form for edit ── */
  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setFormData({
      tanggal: row.tanggal?.slice(0, 10) || todayStr(),
      nama_akun: row.nama_akun,
      keterangan: row.keterangan,
      quantity: row.quantity,
      nominal: row.nominal,
      office_id: row.office_id,
      coa_debet: row.coa_debet,
      coa_kredit: row.coa_kredit,
      nama_akun_kredit: row.nama_akun_kredit,
      no_resi: row.no_resi,
      referensi: row.referensi,
    });
    setView('form');
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!formData.tanggal || !formData.nominal || !formData.office_id) {
      toast.error('Tanggal, nominal, dan kantor wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal simpan');
      toast.success(editingId ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan');
      mutate(); setView('list');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  /* ── Status change ── */
  const changeStatus = async (id: number, action: 'approve' | 'reject' | 'unapprove') => {
    try {
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Gagal update status');
      toast.success(action === 'approve' ? 'Disetujui' : action === 'reject' ? 'Ditolak' : 'Di-reset');
      mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  /* ── Bulk ── */
  const bulkAction = async (action: 'approve' | 'reject' | 'unapprove') => {
    if (!selected.length) { toast.info('Pilih data terlebih dahulu'); return; }
    try {
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, action }),
      });
      if (!res.ok) throw new Error('Gagal bulk action');
      toast.success(`${selected.length} data berhasil di-${action}`);
      setSelected([]); mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await fetch(`/api/fins/pertanggungjawaban?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      toast.success('Data dihapus'); mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  /* ── Export CSV ── */
  const exportCsv = () => {
    if (!rows.length) { toast.info('Tidak ada data untuk di-export'); return; }
    const headers = ['Tanggal','ID Buku','Nama Akun','Keterangan','Quantity','Nominal','User Input','Kantor','COA Debet','COA Kredit','Nama Akun Kredit','No Resi','Referensi','Status'];
    const csvRows = rows.map((r) => [
      r.tanggal?.slice(0,10), r.id_buku, r.nama_akun, r.keterangan,
      r.quantity, r.nominal, r.user_input, r.office_nama,
      r.coa_debet, r.coa_kredit, r.nama_akun_kredit, r.no_resi, r.referensi,
      STATUS_TEXT[r.approve] || r.approve,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `pertanggungjawaban-${todayStr()}.csv`; a.click();
  };

  /* ─── SELECT ALL ──────── */
  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleOne = (id: number) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  /* ═══════════════════════════════ FORM VIEW ═══════════════════════════════ */
  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-50/60 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')}
              className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">
                {editingId ? 'Edit Pertanggungjawaban' : 'Tambah Pertanggungjawaban'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Modul Keuangan · FINS</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tanggal <span className="text-rose-500">*</span></label>
                <input type="date" value={formData.tanggal} onChange={(e) => setField('tanggal', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Kantor <span className="text-rose-500">*</span></label>
                <select value={formData.office_id} onChange={(e) => setField('office_id', Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                  {offices.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Akun</label>
              <input type="text" value={formData.nama_akun} onChange={(e) => setField('nama_akun', e.target.value)}
                placeholder="cth: Uang Muka Kegiatan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Keterangan</label>
              <textarea value={formData.keterangan} onChange={(e) => setField('keterangan', e.target.value)}
                rows={2} placeholder="Deskripsi transaksi..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
                <input type="number" min={1} value={formData.quantity} onChange={(e) => setField('quantity', Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nominal <span className="text-rose-500">*</span></label>
                <input type="number" min={0} value={formData.nominal} onChange={(e) => setField('nominal', e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">COA Debet</label>
                <SearchableSelect
                  options={coaOptions}
                  value={formData.coa_debet}
                  onChange={(v) => setField('coa_debet', v)}
                  placeholder="Pilih COA Debet"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">COA Kredit</label>
                <SearchableSelect
                  options={coaOptions}
                  value={formData.coa_kredit}
                  onChange={(v) => setField('coa_kredit', v)}
                  placeholder="Pilih COA Kredit"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Akun Kredit</label>
              <input type="text" value={formData.nama_akun_kredit} onChange={(e) => setField('nama_akun_kredit', e.target.value)}
                placeholder="cth: BSI Penyaluran 8889292939"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">No Resi</label>
                <input type="text" value={formData.no_resi} onChange={(e) => setField('no_resi', e.target.value)}
                  placeholder="Nomor resi / referensi bank"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Referensi</label>
                <input type="text" value={formData.referensi} onChange={(e) => setField('referensi', e.target.value)}
                  placeholder="Referensi dokumen"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setView('list')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                <Save size={15} />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ LIST VIEW ═══════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50/60 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Pertanggungjawaban CA</h1>
          <p className="text-xs text-slate-400 mt-0.5">Daftar pertanggungjawaban Cash Advance beserta status approval</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
          <Plus size={16} />
          Tambah
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Periode */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={periodeFrom} onChange={(e) => { setPeriodeFrom(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            <span className="text-slate-300 text-sm">–</span>
            <input type="date" value={periodeTo} onChange={(e) => { setPeriodeTo(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 flex-1">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input type="text" value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                placeholder="Cari ID Buku, nama akun, keterangan..."
                className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full" />
              {keywordDraft && (
                <button onClick={() => { setKeywordDraft(''); setKeyword(''); setPage(1); }}>
                  <X size={12} className="text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <button onClick={commitSearch}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
              Cari
            </button>
            <button onClick={() => setShowAdvance((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${showAdvance ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={13} />
              Advance
              {showAdvance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Export / Import / Multi-select */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => toast.info('Fitur import belum tersedia')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Upload size={13} /> Import
            </button>
            <button onClick={() => { setMultiMode((p) => !p); setSelected([]); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${multiMode ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <CheckCheck size={13} />
              {multiMode ? 'Batal Pilih' : 'Multiple Select'}
            </button>
          </div>
        </div>

        {/* Status + Kantor row */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={officeFilter} onChange={(e) => { setOfficeFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
            <option value="all">Semua Kantor</option>
            {offices.map((o) => <option key={o.id} value={String(o.id)}>{o.nama}</option>)}
          </select>
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <RotateCcw size={12} /> Reset
          </button>

          {/* Bulk actions */}
          {multiMode && selected.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-slate-500 mr-1">{selected.length} dipilih</span>
              <button onClick={() => bulkAction('approve')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition-colors">
                <CheckCircle size={12} /> Approve
              </button>
              <button onClick={() => bulkAction('reject')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs hover:bg-rose-700 transition-colors">
                <XCircle size={12} /> Reject
              </button>
              <button onClick={() => bulkAction('unapprove')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs hover:bg-amber-600 transition-colors">
                <RotateCcw size={12} /> Unapprove
              </button>
            </div>
          )}
        </div>

        {/* Advance filters */}
        {showAdvance && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 w-56">
              <input type="text" value={namaAkunFilter}
                onChange={(e) => { setNamaAkunFilter(e.target.value); setPage(1); }}
                placeholder="Filter nama akun..."
                className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full" />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 w-52">
              <input type="text" value={coaFilter}
                onChange={(e) => { setCoaFilter(e.target.value); setPage(1); }}
                placeholder="Filter COA debet..."
                className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-slate-50/50">
                {multiMode && (
                  <th className="text-left px-3 py-3 text-slate-400 font-medium border-b border-slate-100 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                )}
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">TANGGAL</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">ID BUKU</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">NAMA AKUN</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">KETERANGAN</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">QTY</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">NOMINAL</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">USER INPUT</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">KANTOR</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">COA DEBET</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">COA KREDIT</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">NAMA AKUN KREDIT</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">NO RESI</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">REFERENSI</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">STATUS</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: multiMode ? 16 : 15 }).map((__, j) => (
                        <td key={j} className="px-4 py-3 border-b border-slate-50">
                          <div className="h-3 bg-slate-100 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.length === 0
                ? (
                    <tr>
                      <td colSpan={multiMode ? 16 : 15} className="text-center py-16 text-slate-400 text-sm">
                        Tidak ada data pertanggungjawaban
                      </td>
                    </tr>
                  )
                : rows.map((row) => (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${selected.includes(row.id) ? 'bg-blue-50/40' : ''}`}>
                      {multiMode && (
                        <td className="px-3 py-3 border-b border-slate-50">
                          <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        </td>
                      )}
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.tanggal?.slice(0, 10) || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 whitespace-nowrap">
                        <span className="font-mono text-blue-600 font-medium">{row.id_buku}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-700 max-w-[140px] truncate" title={row.nama_akun}>
                        {row.nama_akun || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 max-w-[160px] truncate" title={row.keterangan}>
                        {row.keterangan || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-700 text-right">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-800 font-medium text-right whitespace-nowrap">
                        {fmt(Number(row.nominal))}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.user_input || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.office_nama || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 font-mono whitespace-nowrap">
                        {row.coa_debet || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 font-mono whitespace-nowrap">
                        {row.coa_kredit || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 max-w-[140px] truncate" title={row.nama_akun_kredit}>
                        {row.nama_akun_kredit || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.no_resi || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.referensi || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[row.approve] || 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_TEXT[row.approve] || row.approve}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {row.approve !== 'as' && (
                            <button onClick={() => changeStatus(row.id, 'approve')} title="Approve"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {row.approve !== 'rs' && (
                            <button onClick={() => changeStatus(row.id, 'reject')} title="Reject"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                              <XCircle size={14} />
                            </button>
                          )}
                          {row.approve !== 'us' && (
                            <button onClick={() => changeStatus(row.id, 'unapprove')} title="Unapprove"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors">
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button onClick={() => openEdit(row)} title="Edit"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(row.id)} title="Hapus"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
            {/* Total footer */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/50">
                  {multiMode && <td />}
                  <td colSpan={5} className="px-4 py-3 border-t border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">Σ Total</span>
                  </td>
                  <td className="px-4 py-3 border-t border-slate-200 text-right">
                    <span className="text-xs font-bold text-slate-800">{fmt(grandTotal)}</span>
                  </td>
                  <td colSpan={multiMode ? 9 : 8} className="border-t border-slate-200" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
            offset={offset}
            limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
