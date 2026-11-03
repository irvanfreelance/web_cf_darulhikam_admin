"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, FileText, Filter, Loader2, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type JurnalRow = {
  id: number;
  id_jurnal: string;
  id_trans: string;
  id_exre: string;
  coa: string;
  coa_nama: string | null;
  debet: number;
  kredit: number;
  keterangan: string;
  nik_input: string;
  tgl_exre: string;
  id_kantor: number | null;
  kantor_nama: string | null;
  jenis: string;
  noresi: string;
  fins_trans_id: number;
};

type RekapResponse = {
  rows: JurnalRow[];
  total: number;
  totalDebet: number;
  totalKredit: number;
};

type CoaOption = {
  coa: string;
  nama_perkiraan: string;
};

export default function RekapJurnalPage() {
  const [periodeFrom, setPeriodeFrom] = useState('');
  const [periodeTo, setPeriodeTo] = useState('');
  const [idKantor, setIdKantor] = useState('all');
  const [coa, setCoa] = useState('all');
  const [jenis, setJenis] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isExporting, setIsExporting] = useState(false);

  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (periodeFrom) params.set('periodeFrom', periodeFrom);
  if (periodeTo) params.set('periodeTo', periodeTo);
  if (idKantor !== 'all') params.set('idKantor', idKantor);
  if (coa !== 'all') params.set('coa', coa);
  if (jenis !== 'all') params.set('jenis', jenis);
  if (keyword) params.set('keyword', keyword);

  const { data, error, isLoading, mutate } = useSWR<RekapResponse>(
    `/api/fins/rekap-jurnal?${params.toString()}`,
    jsonFetcher
  );

  const { data: coaList } = useSWR<any[]>(
    '/api/fins/coa',
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json();
      return (json?.rows || json || []).filter((c: any) => c.active === 'y' && c.parent === 'n');
    }
  );

  const { data: kantorList } = useSWR<any[]>(
    '/api/crm/kantor',
    jsonFetcher
  );

  // Modal Jurnal Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    tglExre: new Date().toISOString().slice(0, 10),
    coaDebet: '',
    coaKredit: '',
    nominal: 0,
    keterangan: '',
    idKantor: '' as string | number,
    jenisAje: 'koreksi',
    noresi: '',
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.loading('Mempersiapkan data export...');
      const exportParams = new URLSearchParams(params);
      exportParams.set('limit', '10000');
      exportParams.set('offset', '0');

      const res = await fetch(`/api/fins/rekap-jurnal?${exportParams.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil data export');
      const json: RekapResponse = await res.json();
      const rows = json.rows || [];

      if (rows.length === 0) {
        toast.dismiss();
        toast.error('Tidak ada data untuk diexport');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        rows.map((r, idx) => ({
          'No': idx + 1,
          'ID Jurnal': r.id_jurnal,
          'Tanggal': r.tgl_exre ? r.tgl_exre.slice(0, 10) : '-',
          'Kode Akun': r.coa,
          'Nama Akun': r.coa_nama || '-',
          'Debet': Number(r.debet || 0),
          'Kredit': Number(r.kredit || 0),
          'Keterangan': r.keterangan || '-',
          'No. Bukti / Ref': r.id_exre || r.noresi || '-',
          'Kantor': r.kantor_nama || '-',
          'Input Oleh': r.nik_input || '-',
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Jurnal');
      XLSX.writeFile(workbook, `Rekap_Jurnal_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.dismiss();
      toast.success('Rekap jurnal berhasil diexport');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualForm.coaDebet === manualForm.coaKredit) {
      toast.error('COA Debet dan Kredit tidak boleh sama');
      return;
    }
    if (Number(manualForm.nominal) <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fins/rekap-jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          idKantor: manualForm.idKantor ? Number(manualForm.idKantor) : null,
          nominal: Number(manualForm.nominal),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menyimpan jurnal manual');
      }

      toast.success('Jurnal manual / penyesuaian berhasil disimpan');
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Rekap Jurnal"
        description="Buku jurnal transaksi umum & entri penyesuaian keuangan lembaga"
      >
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Download size={16} className="text-teal-600" />}
          Export Excel
        </button>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} /> Entri Jurnal Manual
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={periodeFrom}
            onChange={(e) => { setPeriodeFrom(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={periodeTo}
            onChange={(e) => { setPeriodeTo(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kantor</label>
          <select
            value={idKantor}
            onChange={(e) => { setIdKantor(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="all">Semua Kantor</option>
            {(kantorList || []).map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Akun COA</label>
          <select
            value={coa}
            onChange={(e) => { setCoa(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="all">Semua Akun</option>
            {(coaList || []).map((c: any) => (
              <option key={c.coa} value={c.coa}>{c.coa} - {c.nama_perkiraan}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Jenis</label>
          <select
            value={jenis}
            onChange={(e) => { setJenis(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="all">Semua Jenis</option>
            <option value="r">Penerimaan (r)</option>
            <option value="e">Pengeluaran (e)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pencarian</label>
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="No Jurnal, Keterangan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tabel Jurnal */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3 font-medium text-center">No</th>
                <th className="px-3 py-3 font-medium">Tanggal</th>
                <th className="px-3 py-3 font-medium">ID Jurnal</th>
                <th className="px-3 py-3 font-medium">Akun COA</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
                <th className="px-3 py-3 font-medium">Kantor</th>
                <th className="px-3 py-3 font-medium text-right">Debet</th>
                <th className="px-3 py-3 font-medium text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Memuat data rekap jurnal...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Gagal memuat rekap jurnal.
                  </td>
                </tr>
              ) : data?.rows?.length ? (
                data.rows.map((row, idx) => (
                  <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-center text-xs text-slate-500 font-medium">
                      {offset + idx + 1}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {row.tgl_exre ? row.tgl_exre.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800 text-xs whitespace-nowrap">
                      {row.id_jurnal}
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      <span className="font-semibold text-teal-800">{row.coa}</span>
                      <div className="text-xs text-slate-500">{row.coa_nama || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <div className="line-clamp-2">{row.keterangan}</div>
                      {row.id_exre && (
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {row.id_exre}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {row.kantor_nama || 'Pusat'}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {Number(row.debet) > 0 ? formatIDR(Number(row.debet)) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {Number(row.kredit) > 0 ? formatIDR(Number(row.kredit)) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Belum ada entri jurnal pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total Footer */}
            {data && data.rows && data.rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase tracking-wider">
                    Total Halaman Ini / Filter:
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-700">
                    {formatIDR(data.totalDebet)}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-700">
                    {formatIDR(data.totalKredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          offset={offset}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next) => { setLimit(next); setPage(1); }}
          isLoading={isLoading}
        />
      </div>

      {/* Modal Jurnal Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Entri Jurnal Manual / Penyesuaian</h3>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.tglExre}
                    onChange={(e) => setManualForm({ ...manualForm, tglExre: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis AJE
                  </label>
                  <select
                    value={manualForm.jenisAje}
                    onChange={(e) => setManualForm({ ...manualForm, jenisAje: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="koreksi">Koreksi</option>
                    <option value="akrual">Akrual</option>
                    <option value="depresiasi">Depresiasi</option>
                    <option value="penutup">Penutup</option>
                    <option value="balik">Balik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Debet <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={manualForm.coaDebet}
                  onChange={(e) => setManualForm({ ...manualForm, coaDebet: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Debet —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>
                      {c.coa} - {c.nama_perkiraan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kredit <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={manualForm.coaKredit}
                  onChange={(e) => setManualForm({ ...manualForm, coaKredit: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Kredit —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>
                      {c.coa} - {c.nama_perkiraan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={manualForm.nominal || ''}
                    onChange={(e) => setManualForm({ ...manualForm, nominal: Number(e.target.value) })}
                    placeholder="100000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kantor
                  </label>
                  <select
                    value={manualForm.idKantor}
                    onChange={(e) => setManualForm({ ...manualForm, idKantor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">— Kantor Pusat —</option>
                    {(kantorList || []).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Jurnal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualForm.keterangan}
                  onChange={(e) => setManualForm({ ...manualForm, keterangan: e.target.value })}
                  placeholder="Keterangan penyesuaian atau transaksi..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
