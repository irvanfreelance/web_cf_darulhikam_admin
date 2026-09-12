"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { Search, Download, SlidersHorizontal, Wallet, Save, XCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/shared/pagination';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unapprove', label: 'Unapprove' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

const STATUS_BADGE: Record<string, string> = {
  a: 'bg-emerald-50 text-emerald-600',
  r: 'bg-rose-50 text-rose-600',
  as: 'bg-amber-50 text-amber-600',
};
const STATUS_TEXT: Record<string, string> = {
  a: 'Approved', r: 'Rejected', as: 'Unapprove',
};

type PencairanRow = {
  id: number; id_buku: string; tanggal: string; coa_debet: string; coa_kredit: string;
  nama_akun: string; keterangan: string; quantity: number; nominal: string; realisasi: string;
  user_input: string; user_approve: string; approve: 'as' | 'a' | 'r';
  office_id: number; office_nama: string;
  no_resi: string; via_bayar: string; bank_rek_id: string | null; tag: string;
  referensi_mitra: string; pencair: string; tanggal_cair: string | null;
};

const generateNoResi = (id: number) => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${id}`;
};

export default function PencairanPage() {
  const { data: session } = useSession();
  const { data: masters } = useSWR('/api/fins/masters', fetcher);

  const [periodeFrom, setPeriodeFrom] = useState('2026-01-01');
  const [periodeTo, setPeriodeTo] = useState(todayStr());
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('unapprove');
  const [officeFilter, setOfficeFilter] = useState('1');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const queryParams = new URLSearchParams({
    periodeFrom, periodeTo, keyword, status: statusFilter, officeId: officeFilter,
  });
  const { data: records, isLoading, mutate } = useSWR<PencairanRow[]>(
    `/api/fins/pencairan?${queryParams.toString()}`,
    fetcher
  );

  const rows = records || [];
  const totalNominal = rows.reduce((s, r) => s + Number(r.nominal) * r.quantity, 0);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * limit, currentPage * limit);

  const officeOptions = (masters?.offices || []).map((o: { id: number; nama: string }) => ({ id: o.id, name: o.nama }));
  const bankRekOptions = (masters?.bankRek || []).map((b: { id_rekening: string; bank: string; keterangan: string }) => ({
    id: b.id_rekening, name: `${b.bank} — ${b.keterangan}`,
  }));

  const commitSearch = () => { setKeyword(keywordDraft); setPage(1); };

  const [modalRow, setModalRow] = useState<PencairanRow | null>(null);
  const [form, setForm] = useState({
    noResi: '', viaBayar: 'bank', bankRekId: '', tag: 'external',
    referensiMitra: '', pencair: '', tanggal: todayStr(), cairkan: true,
  });
  const [saldoBank, setSaldoBank] = useState<{ saldoAkhir: number; tanggal: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const openPencairan = (row: PencairanRow) => {
    setModalRow(row);
    setForm({
      noResi: row.no_resi || generateNoResi(row.id),
      viaBayar: row.via_bayar || 'bank',
      bankRekId: row.bank_rek_id || '',
      tag: row.tag || 'external',
      referensiMitra: row.referensi_mitra || '',
      pencair: row.pencair || session?.user?.name || '',
      tanggal: row.tanggal_cair || todayStr(),
      cairkan: true,
    });
    setSaldoBank(null);
  };
  const closeModal = () => setModalRow(null);

  const selectedBank = bankRekOptions.find((b: { id: string }) => b.id === form.bankRekId);
  const selectedBankRek = (masters?.bankRek || []).find((b: any) => b.id_rekening === form.bankRekId);

  useEffect(() => {
    if (!modalRow || form.viaBayar !== 'bank' || !selectedBankRek) { setSaldoBank(null); return; }
    fetch(`/api/fins/pencairan/saldo-bank?coa=${selectedBankRek.coa}&officeId=${modalRow.office_id}`)
      .then(res => res.json())
      .then(setSaldoBank)
      .catch(() => setSaldoBank({ saldoAkhir: 0, tanggal: null }));
  }, [form.bankRekId, form.viaBayar, modalRow]);

  const handleSave = async () => {
    if (!modalRow) return;
    if (!form.cairkan) { toast.error('Centang Cairkan pada Detail Pencairan terlebih dahulu.'); return; }
    if (form.viaBayar === 'bank' && !form.bankRekId) { toast.error('Pilih rekening bank terlebih dahulu.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/fins/pencairan/${modalRow.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          noResi: form.noResi, viaBayar: form.viaBayar, bankRekId: form.bankRekId || null,
          tag: form.tag, referensiMitra: form.referensiMitra, pencair: form.pencair,
          tanggal: form.tanggal, cairkan: form.cairkan,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Gagal menyimpan pencairan');
        return;
      }
      toast.success('Pencairan berhasil disimpan');
      closeModal();
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    if (!modalRow) return;
    toast('Tolak pencairan CA ini?', {
      action: {
        label: 'Tolak',
        onClick: async () => {
          setSaving(true);
          try {
            const res = await fetch(`/api/fins/pencairan/${modalRow.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reject', pencair: form.pencair }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              toast.error(body.error || 'Gagal menolak pencairan');
              return;
            }
            toast.success('Pencairan ditolak');
            closeModal();
            mutate();
          } finally {
            setSaving(false);
          }
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Pencairan</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Pencairan dana atas Pengajuan Cash Advance (CA) yang sudah disetujui</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center text-left">
        <span className="text-xs font-semibold text-slate-500">Periode:</span>
        <input type="date" value={periodeFrom} onChange={e => setPeriodeFrom(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
        <span className="text-xs text-slate-400">s/d</span>
        <input type="date" value={periodeTo} onChange={e => setPeriodeTo(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />

        <div className="relative flex-1 min-w-[220px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input type="text" placeholder="Keyword..." value={keywordDraft}
            onChange={e => setKeywordDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
        </div>
        <button onClick={commitSearch} className="px-5 py-2.5 rounded-xl border border-slate-100 bg-white text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <Search size={16} /> Search
        </button>
        <button onClick={() => toast.info('Filter lanjutan belum tersedia.')} className="px-5 py-2.5 rounded-xl border border-slate-100 bg-white text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <SlidersHorizontal size={16} /> Advance
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

      <div>
        <button onClick={() => toast.info('Export belum tersedia.')} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Download size={18} /> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-slate-800">Daftar Pencairan</h2>
        </div>
        <div className="overflow-x-auto p-6 pt-4">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-medium uppercase">
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Tanggal</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">ID Buku</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Nama Akun</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Keterangan</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-center">Quantity</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-right">Nominal</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-right">Realisasi</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Pencair</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Kantor</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={10} className="h-16 px-6 py-4"></td></tr>)
              ) : paged.length > 0 ? (
                paged.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.tanggal.slice(0, 10)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-teal-600">{r.id_buku}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-800">{r.nama_akun}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-500">{r.keterangan || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">{r.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm font-normal text-slate-800">{fmt(Number(r.nominal) * r.quantity)}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-500">{fmt(Number(r.realisasi))}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.pencair || '-'}</td>
                    <td className="px-6 py-4 text-sm font-normal text-slate-600">{r.office_nama}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.approve]}`}>{STATUS_TEXT[r.approve]}</span>
                        {r.approve === 'as' && (
                          <button title="Buat Pencairan" onClick={() => openPencairan(r)} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors">
                            <Wallet size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data</td></tr>
              )}
            </tbody>
            {paged.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/50">
                  <td colSpan={5} className="px-6 py-3.5 text-right text-sm font-semibold text-slate-700">&Sigma; Total :</td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(totalNominal)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
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

      <Modal
        isOpen={!!modalRow}
        onClose={closeModal}
        title="Pencairan Cash Advance (CA)"
        maxWidth="2xl"
      >
        {modalRow && (
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Informasi Pencairan</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">No Resi</label>
                  <input value={form.noResi} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Approver</label>
                  <input value={modalRow.user_approve || '-'} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Pengaju</label>
                  <input value={modalRow.user_input || '-'} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kantor</label>
                  <input value={modalRow.office_nama || '-'} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Pencair</label>
                  <input value={form.pencair} onChange={e => setForm(f => ({ ...f, pencair: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Via Bayar</label>
                  <select value={form.viaBayar} onChange={e => setForm(f => ({ ...f, viaBayar: e.target.value, bankRekId: '' }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500">
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tag</label>
                  <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500">
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>

                {form.viaBayar === 'bank' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank</label>
                      <SearchableSelect options={bankRekOptions} value={form.bankRekId} onChange={val => setForm(f => ({ ...f, bankRekId: String(val) }))} placeholder="Pilih rekening bank" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Saldo Bank</label>
                      <input value={fmt(saldoBank?.saldoAkhir || 0)} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-600" />
                      <p className="text-[11px] text-rose-500 font-medium mt-1">Tanggal: {saldoBank?.tanggal ? saldoBank.tanggal.slice(0, 10) : todayStr()}</p>
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Referensi/Mitra</label>
                  <input value={form.referensiMitra} onChange={e => setForm(f => ({ ...f, referensiMitra: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-500" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Detail Pencairan</h3>
              <div className="rounded-2xl border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-medium uppercase">
                      <th className="px-4 py-3 border-b border-slate-100 font-normal">COA</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal">Nama Akun</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal text-center">Qty</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal text-right">Nominal Satuan</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal text-right">Total Nominal</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal">Keterangan</th>
                      <th className="px-4 py-3 border-b border-slate-100 font-normal text-center">Cairkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{modalRow.coa_debet}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{modalRow.nama_akun}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{modalRow.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(Number(modalRow.nominal))}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{fmt(Number(modalRow.nominal) * modalRow.quantity)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{modalRow.keterangan || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={form.cairkan} onChange={e => setForm(f => ({ ...f, cairkan: e.target.checked }))} className="w-4 h-4 text-teal-600 rounded border-slate-300" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={closeModal} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                <X size={16} /> Cancel
              </button>
              <button onClick={handleReject} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                <XCircle size={16} /> Reject
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
