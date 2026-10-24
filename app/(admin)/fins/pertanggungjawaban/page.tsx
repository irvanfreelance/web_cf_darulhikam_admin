"use client";

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Upload, Download, Search, X, CheckCircle, XCircle,
  RotateCcw, ChevronDown, ChevronUp, CheckCheck, Filter, FileCheck,
  Plus, Trash2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/shared/pagination';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const todayStr = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

const STATUS_BADGE: Record<string, string> = {
  a:   'bg-amber-50 text-amber-600',
  aj:  'bg-blue-50 text-blue-600',
  asj: 'bg-emerald-50 text-emerald-600',
};
const STATUS_TEXT: Record<string, string> = {
  a:   'Belum Diajukan',
  aj:  'Diajukan',
  asj: 'Selesai',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'a',   label: 'Belum Diajukan' },
  { value: 'aj',  label: 'Diajukan' },
  { value: 'asj', label: 'Selesai' },
];

type Row = {
  id: number;
  id_buku: string;
  tanggal: string;
  nama_akun: string;
  keterangan: string;
  quantity: number;
  nominal: string;
  realisasi: string;
  user_input: string;
  user_approve: string;
  approve: 'a' | 'aj' | 'asj';
  office_id: number;
  office_nama: string;
  coa_debet: string;
  coa_kredit: string;
  no_resi: string;
  referensi_mitra: string;
  tanggal_cair: string;
};

type DetailRow = {
  id: number;
  id_buku: string;
  tanggal: string;
  nama_akun: string;
  keterangan: string;
  quantity: number;
  nominal: string;
  coa_debet: string;
  coa_kredit: string;
};

type CaDetail = Row & {
  bank_rek_keterangan: string;
  bank_rek_coa: string;
  bank_nama: string;
  via_bayar: string;
  pencair: string;
  user_approve: string;
};

/* ─────────────────────── Detail Modal ─────────────────────── */
function DetailModal({
  caRow,
  onClose,
  onRefresh,
  masters,
}: {
  caRow: Row;
  onClose: () => void;
  onRefresh: () => void;
  masters: any;
}) {
  const { data, mutate: mutateDetail, isLoading: loadingDetail } = useSWR(
    `/api/fins/pertanggungjawaban/detail?caId=${caRow.id}&idBuku=${caRow.id_buku}`,
    fetcher
  );

  const ca: CaDetail | null = data?.ca || null;
  const details: DetailRow[] = data?.details || [];

  /* ── Form state for adding new breakdown row ── */
  const [formCoa, setFormCoa]           = useState('');
  const [formNamaAkun, setFormNamaAkun] = useState('');
  const [formNominal, setFormNominal]   = useState('');
  const [formKet, setFormKet]           = useState('');
  const [adding, setAdding]             = useState(false);
  const [saving, setSaving]             = useState(false);

  const jenisTransaksi: { coa: string; nama: string }[] = masters?.jenisTransaksi || [];

  const totalBreakdown = details.reduce((s, d) => s + Number(d.nominal), 0);
  const nominalCA      = Number(caRow.nominal) * Number(caRow.quantity);

  const handleAddRow = async () => {
    if (!formCoa || !formNominal) { toast.error('Pilih jenis transaksi dan isi nominal'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/fins/pertanggungjawaban/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idBuku: caRow.id_buku,
          tanggal: caRow.tanggal_cair || todayStr(),
          namaAkun: formNamaAkun,
          keterangan: formKet,
          quantity: 1,
          nominal: Number(formNominal.replace(/\./g, '').replace(',', '.')),
          officeId: caRow.office_id,
          coaDebet: formCoa,
          coaKredit: ca?.bank_rek_coa || caRow.coa_kredit || '',
          noResi: caRow.no_resi,
        }),
      });
      if (!res.ok) throw new Error('Gagal tambah breakdown');
      setFormCoa(''); setFormNamaAkun(''); setFormNominal(''); setFormKet('');
      mutateDetail();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/fins/pertanggungjawaban/detail?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      mutateDetail();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSave = async () => {
    if (details.length === 0) { toast.error('Tambahkan minimal satu item breakdown'); return; }
    setSaving(true);
    try {
      // Update realisasi on fins_ca_pengajuan and set status to aj
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: caRow.id, action: 'submit', realisasi: totalBreakdown }),
      });
      if (!res.ok) throw new Error('Gagal submit pertanggungjawaban');
      toast.success('Pertanggungjawaban berhasil diajukan');
      onRefresh();
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const onJenisChange = (coa: string) => {
    setFormCoa(coa);
    const found = jenisTransaksi.find((j) => j.coa === coa);
    setFormNamaAkun(found?.nama || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Pertanggungjawaban Cash Advance (CA)</h2>
            <p className="text-blue-100 text-xs mt-0.5">
              No Resi {caRow.no_resi || '—'} — {caRow.coa_debet} — {caRow.nama_akun}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Memuat data...
            </div>
          ) : (
            <>
              {/* ── Informasi Pertanggungjawaban ── */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Informasi Pertanggungjawaban
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['No Resi',    caRow.no_resi || '—'],
                    ['Approver',   caRow.user_approve || '—'],
                    ['Pengaju',    caRow.user_input || '—'],
                    ['Pengembali', ca?.pencair || '—'],
                    ['Pencair',    ca?.pencair || '—'],
                    ['Kantor',     caRow.office_nama || '—'],
                    ['Via Bayar',  ca?.via_bayar === 'bank' ? 'Bank' : 'Cash'],
                    ['Tanggal',    caRow.tanggal_cair ? new Date(caRow.tanggal_cair).toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'],
                    ['Bank',       ca ? `${ca.bank_nama || ''} ${ca.bank_rek_keterangan || ''}`.trim() : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 rounded-xl px-4 py-2.5 col-span-1">
                      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                      <p className="text-xs text-slate-700 font-medium truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── CA Item Table ── */}
              <div>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">COA</th>
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">NAMA AKUN</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">QUANTITY</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">NOMINAL SATUAN</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">TOTAL NOMINAL</th>
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">KETERANGAN</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">REALISASI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-3 font-mono text-slate-600">{caRow.coa_debet}</td>
                        <td className="px-4 py-3 text-slate-700">{caRow.nama_akun}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{caRow.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-800 font-medium">{fmt(Number(caRow.nominal))}</td>
                        <td className="px-4 py-3 text-right text-slate-800 font-medium">{fmt(nominalCA)}</td>
                        <td className="px-4 py-3 text-slate-600">{caRow.keterangan || '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(Number(caRow.realisasi || 0))}</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-slate-600">Total :</td>
                        <td />
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-800">{fmt(nominalCA)}</td>
                        <td />
                        <td className="px-4 py-2.5 text-right text-xs font-medium text-slate-600">{fmt(Number(caRow.realisasi || 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Break Pertanggungjawaban ── */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Break Pertanggungjawaban
                </h3>

                {/* Input form */}
                {caRow.approve !== 'asj' && (
                  <div className="grid grid-cols-12 gap-2 mb-3">
                    <div className="col-span-4">
                      <select
                        value={formCoa}
                        onChange={(e) => onJenisChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                        <option value="">Jenis Transaksi</option>
                        {jenisTransaksi.map((j) => (
                          <option key={j.coa} value={j.coa}>{j.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={formNominal}
                        onChange={(e) => setFormNominal(e.target.value)}
                        placeholder="Realisasi"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={formKet}
                        onChange={(e) => setFormKet(e.target.value)}
                        placeholder="Keterangan"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={handleAddRow}
                        disabled={adding}
                        className="w-full h-full flex items-center justify-center gap-1 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Tambah
                      </button>
                    </div>
                  </div>
                )}

                {/* Breakdown table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">COA</th>
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">NAMA AKUN</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">QUANTITY</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">NOMINAL SATUAN</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">TOTAL NOMINAL</th>
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">KETERANGAN</th>
                        {caRow.approve !== 'asj' && (
                          <th className="text-center px-4 py-2.5 text-slate-400 font-medium border-b border-slate-100">ACTION</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={caRow.approve !== 'asj' ? 7 : 6} className="text-center py-8 text-slate-300 text-xs">
                            Belum ada baris breakdown
                          </td>
                        </tr>
                      ) : (
                        details.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-mono text-slate-600">{d.coa_debet}</td>
                            <td className="px-4 py-2.5 text-slate-700">{d.nama_akun}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{d.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-slate-800 font-medium">{fmt(Number(d.nominal))}</td>
                            <td className="px-4 py-2.5 text-right text-slate-800 font-medium">{fmt(Number(d.nominal) * d.quantity)}</td>
                            <td className="px-4 py-2.5 text-slate-600">{d.keterangan || '—'}</td>
                            {caRow.approve !== 'asj' && (
                              <td className="px-4 py-2.5 text-center">
                                <button onClick={() => handleDelete(d.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                      {details.length > 0 && (
                        <tr className="bg-slate-50">
                          <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-slate-600">Total Breakdown :</td>
                          <td />
                          <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-800">{fmt(totalBreakdown)}</td>
                          <td colSpan={caRow.approve !== 'asj' ? 2 : 1} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Selisih indicator */}
                {details.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      totalBreakdown === nominalCA
                        ? 'bg-emerald-50 text-emerald-600'
                        : totalBreakdown < nominalCA
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      Selisih: {fmt(nominalCA - totalBreakdown)}
                      {totalBreakdown === nominalCA && ' ✓ Seimbang'}
                      {totalBreakdown < nominalCA && ' (sisa kembali)'}
                      {totalBreakdown > nominalCA && ' ⚠ Melebihi nominal'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
            <X size={13} /> Cancel
          </button>
          {caRow.approve === 'a' && (
            <button onClick={handleSave} disabled={saving || details.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Main Page ══════════════════════════ */
export default function PertanggungjawabanPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  /* ── Filters ── */
  const [periodeFrom, setPeriodeFrom] = useState(yearStart());
  const [periodeTo, setPeriodeTo]     = useState(todayStr());
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [showAdvance, setShowAdvance]   = useState(false);

  /* ── Pagination ── */
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  /* ── Multi-select ── */
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected]   = useState<number[]>([]);

  /* ── Detail modal ── */
  const [detailRow, setDetailRow] = useState<Row | null>(null);

  const params = new URLSearchParams({
    periodeFrom, periodeTo,
    ...(keyword ? { keyword } : {}),
    status: statusFilter,
    officeId: officeFilter,
    limit: String(limit),
    offset: String(offset),
  });

  const { data, mutate, isLoading } = useSWR(
    `/api/fins/pertanggungjawaban?${params}`,
    fetcher
  );

  const rows: Row[]      = data?.rows || [];
  const total: number    = data?.total || 0;
  const grandTotal: number = data?.grandTotal || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const offices: { id: number; nama: string }[] = masters?.offices || [];

  /* ── Helpers ── */
  const commitSearch = () => { setKeyword(keywordDraft); setPage(1); };
  const clearFilters = () => {
    setPeriodeFrom(yearStart()); setPeriodeTo(todayStr());
    setKeywordDraft(''); setKeyword('');
    setStatusFilter('all'); setOfficeFilter('all');
    setPage(1);
  };

  const changeStatus = async (id: number, action: 'submit' | 'approve' | 'unapprove') => {
    try {
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Gagal update status');
      const label = action === 'submit' ? 'Diajukan' : action === 'approve' ? 'Disetujui' : 'Di-reset';
      toast.success(`Status berhasil: ${label}`);
      mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  const bulkAction = async (action: 'submit' | 'approve' | 'unapprove') => {
    if (!selected.length) { toast.info('Pilih data terlebih dahulu'); return; }
    try {
      const res = await fetch('/api/fins/pertanggungjawaban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, action }),
      });
      if (!res.ok) throw new Error('Gagal bulk action');
      toast.success(`${selected.length} data berhasil diupdate`);
      setSelected([]); mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  const exportCsv = () => {
    if (!rows.length) { toast.info('Tidak ada data untuk di-export'); return; }
    const headers = ['Tanggal','ID Buku','Nama Akun','Keterangan','Qty','Nominal','Realisasi','User Input','Kantor','COA Debet','COA Kredit','No Resi','Referensi Mitra','Status'];
    const csvRows = rows.map((r) => [
      r.tanggal?.slice(0,10), r.id_buku, r.nama_akun, r.keterangan,
      r.quantity, r.nominal, r.realisasi || '0', r.user_input, r.office_nama,
      r.coa_debet, r.coa_kredit, r.no_resi, r.referensi_mitra,
      STATUS_TEXT[r.approve] || r.approve,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pertanggungjawaban-${todayStr()}.csv`;
    a.click();
  };

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleOne = (id: number) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleRowDoubleClick = useCallback((row: Row) => {
    if (!multiMode) setDetailRow(row);
  }, [multiMode]);

  /* ═══════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50/60 p-6 space-y-4">
      {/* Detail Modal */}
      {detailRow && (
        <DetailModal
          caRow={detailRow}
          onClose={() => setDetailRow(null)}
          onRefresh={mutate}
          masters={masters}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Pertanggungjawaban CA</h1>
          <p className="text-xs text-slate-400 mt-0.5">CA yang sudah dicairkan — double-click baris untuk mengisi breakdown</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Periode */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={periodeFrom}
              onChange={(e) => { setPeriodeFrom(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            <span className="text-slate-300 text-sm">–</span>
            <input type="date" value={periodeTo}
              onChange={(e) => { setPeriodeTo(e.target.value); setPage(1); }}
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

          {/* Tools */}
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

        {/* Status + Kantor */}
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
              <button onClick={() => bulkAction('submit')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors">
                <FileCheck size={12} /> Submit PJ
              </button>
              <button onClick={() => bulkAction('approve')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition-colors">
                <CheckCircle size={12} /> Approve
              </button>
              <button onClick={() => bulkAction('unapprove')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs hover:bg-amber-600 transition-colors">
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          )}
        </div>

        {showAdvance && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">Filter advance: gunakan kolom Semua Kantor dan Status di atas untuk menyaring data lebih spesifik.</p>
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
                <th className="text-right px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">REALISASI</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">USER INPUT</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">KANTOR</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">COA DEBET</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-slate-100 whitespace-nowrap">COA KREDIT</th>
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
                        Tidak ada data — CA yang sudah dicairkan akan muncul di sini
                      </td>
                    </tr>
                  )
                : rows.map((row) => (
                    <tr key={row.id}
                      onDoubleClick={() => handleRowDoubleClick(row)}
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selected.includes(row.id) ? 'bg-blue-50/40' : ''}`}>
                      {multiMode && (
                        <td className="px-3 py-3 border-b border-slate-50">
                          <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)}
                            onClick={(e) => e.stopPropagation()}
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
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-700 text-right whitespace-nowrap">
                        {fmt(Number(row.realisasi || 0))}
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
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 whitespace-nowrap">
                        {row.no_resi || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-slate-600 max-w-[120px] truncate" title={row.referensi_mitra}>
                        {row.referensi_mitra || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[row.approve] || 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_TEXT[row.approve] || row.approve}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}>
                          {row.approve === 'a' && (
                            <button onClick={() => changeStatus(row.id, 'submit')} title="Submit Pertanggungjawaban"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-medium">
                              <FileCheck size={12} /> Submit PJ
                            </button>
                          )}
                          {row.approve === 'aj' && (
                            <button onClick={() => changeStatus(row.id, 'approve')} title="Approve Pertanggungjawaban"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-[10px] font-medium">
                              <CheckCircle size={12} /> Approve
                            </button>
                          )}
                          {row.approve !== 'a' && (
                            <button onClick={() => changeStatus(row.id, 'unapprove')} title="Reset ke Belum Diajukan"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors">
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
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
