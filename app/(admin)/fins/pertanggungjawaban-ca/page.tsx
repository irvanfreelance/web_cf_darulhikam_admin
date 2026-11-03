"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, CheckCircle2, FileText, Loader2, Search, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

type CaRow = {
  id: number;
  id_buku: string;
  tanggal: string;
  coa_debet: string;
  coa_kredit: string;
  nama_akun: string;
  keterangan: string;
  quantity: number;
  nominal: number;
  realisasi: number;
  user_input: string;
  approve: string;
  office_id: number;
  office_nama: string | null;
  tgl_lpj: string | null;
  nominal_lpj: number | null;
  bukti_lpj_url: string | null;
  user_lpj: string;
  pengembali: string;
  selisih: number;
};

export default function PertanggungjawabanCaPage() {
  const [tab, setTab] = useState<'belum' | 'menunggu' | 'selesai'>('belum');
  const [keyword, setKeyword] = useState('');
  const [officeId, setOfficeId] = useState('all');

  const params = new URLSearchParams({
    status: tab,
    officeId,
    keyword,
  });

  const { data, error, isLoading, mutate } = useSWR<CaRow[]>(
    `/api/fins/lpj-ca?${params.toString()}`,
    jsonFetcher
  );

  const { data: offices } = useSWR<any[]>('/api/crm/kantor', jsonFetcher);

  // Modal Submit LPJ
  const [selectedRow, setSelectedRow] = useState<CaRow | null>(null);
  const [submitForm, setSubmitForm] = useState({
    tglLpj: new Date().toISOString().slice(0, 10),
    nominalLpj: 0,
    buktiLpjUrl: '',
    pengembali: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modal Approve LPJ
  const [approveRow, setApproveRow] = useState<CaRow | null>(null);

  const openSubmitModal = (row: CaRow) => {
    setSelectedRow(row);
    setSubmitForm({
      tglLpj: new Date().toISOString().slice(0, 10),
      nominalLpj: Number(row.realisasi || row.nominal),
      buktiLpjUrl: row.bukti_lpj_url || '',
      pengembali: row.user_input || '',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.loading('Mengunggah berkas bukti...');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Gagal unggah bukti');
      const json = await res.json();
      setSubmitForm((prev) => ({ ...prev, buktiLpjUrl: json.url }));
      toast.dismiss();
      toast.success('Bukti berhasil diunggah');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitLpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/fins/lpj-ca/${selectedRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengajukan LPJ');
      }

      toast.success('LPJ berhasil diajukan, menunggu approval finance');
      setSelectedRow(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLpj = async (action: 'approve' | 'reject') => {
    if (!approveRow) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/fins/lpj-ca/${approveRow.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memproses LPJ');
      }

      toast.success(action === 'approve' ? 'LPJ disetujui & jurnal otomatis terbit' : 'LPJ ditolak');
      setApproveRow(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Pertanggungjawaban (LPJ) CA"
        description="Pelaporan realisasi belanja Cash Advance, bukti pengeluaran, pengembalian sisa, dan approval finance"
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('belum')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'belum'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Belum LPJ
        </button>
        <button
          type="button"
          onClick={() => setTab('menunggu')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'menunggu'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Menunggu Approve
        </button>
        <button
          type="button"
          onClick={() => setTab('selesai')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'selesai'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Selesai LPJ
        </button>
      </div>

      {/* Filter Box */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nomor CA, pemegang, keterangan..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
        >
          <option value="all">Semua Kantor</option>
          {(offices || []).map((o: any) => (
            <option key={o.id} value={o.id}>{o.nama}</option>
          ))}
        </select>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nomor CA / Tanggal</th>
                <th className="px-4 py-3 font-medium">Pemegang</th>
                <th className="px-4 py-3 font-medium">Uraian / Akun</th>
                <th className="px-4 py-3 text-right font-medium">Dicairkan</th>
                <th className="px-4 py-3 text-right font-medium">Realisasi (LPJ)</th>
                <th className="px-4 py-3 text-right font-medium">Selisih</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Memuat data...
                  </td>
                </tr>
              ) : data?.length ? (
                data.map((row) => {
                  const selisih = Number(row.realisasi) - Number(row.nominal_lpj || 0);
                  return (
                    <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{row.id_buku}</div>
                        <div className="text-xs text-slate-400">
                          {row.tanggal ? row.tanggal.slice(0, 10) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.user_input}</div>
                        <div className="text-xs text-slate-400">{row.office_nama || 'Pusat'}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-800 line-clamp-1">{row.nama_akun}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{row.keterangan}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatIDR(Number(row.realisasi || row.nominal))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {row.nominal_lpj ? formatIDR(Number(row.nominal_lpj)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {row.nominal_lpj !== null && row.nominal_lpj !== undefined ? (
                          selisih > 0 ? (
                            <span className="text-emerald-600">+{formatIDR(selisih)} (Sisa)</span>
                          ) : selisih < 0 ? (
                            <span className="text-rose-600">-{formatIDR(Math.abs(selisih))} (Kurang)</span>
                          ) : (
                            <span className="text-slate-600">Pas (Rp0)</span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tab === 'belum' && (
                          <button
                            type="button"
                            onClick={() => openSubmitModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            <FileText size={14} /> Ajukan LPJ
                          </button>
                        )}
                        {tab === 'menunggu' && (
                          <button
                            type="button"
                            onClick={() => setApproveRow(row)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <CheckCircle2 size={14} /> Review LPJ
                          </button>
                        )}
                        {tab === 'selesai' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <Check size={13} /> Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada data pada status ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajukan LPJ */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              Formulir Pertanggungjawaban (LPJ) CA
            </h3>
            <p className="text-xs text-slate-500">
              {selectedRow.id_buku} &bull; Dicairkan: {formatIDR(Number(selectedRow.realisasi || selectedRow.nominal))}
            </p>

            <form onSubmit={handleSubmitLpj} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal LPJ / Nota <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={submitForm.tglLpj}
                  onChange={(e) => setSubmitForm({ ...submitForm, tglLpj: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Riil Belanja (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={submitForm.nominalLpj}
                  onChange={(e) => setSubmitForm({ ...submitForm, nominalLpj: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
                <div className="mt-1 text-xs">
                  {Number(selectedRow.realisasi || selectedRow.nominal) - Number(submitForm.nominalLpj) > 0 ? (
                    <span className="text-emerald-600 font-semibold">
                      Sisa yang harus dikembalikan:{' '}
                      {formatIDR(Number(selectedRow.realisasi || selectedRow.nominal) - Number(submitForm.nominalLpj))}
                    </span>
                  ) : Number(selectedRow.realisasi || selectedRow.nominal) - Number(submitForm.nominalLpj) < 0 ? (
                    <span className="text-rose-600 font-semibold">
                      Kekurangan dana:{' '}
                      {formatIDR(Math.abs(Number(selectedRow.realisasi || selectedRow.nominal) - Number(submitForm.nominalLpj)))}
                    </span>
                  ) : (
                    <span className="text-slate-500">Sesuai (Habis tanpa sisa)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penyetor / Pengembali
                </label>
                <input
                  value={submitForm.pengembali}
                  onChange={(e) => setSubmitForm({ ...submitForm, pengembali: e.target.value })}
                  placeholder="Nama staf pemegang CA..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bukti Nota / Kwitansi (URL atau Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    value={submitForm.buktiLpjUrl}
                    onChange={(e) => setSubmitForm({ ...submitForm, buktiLpjUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {isUploading ? <Loader2 size={14} className="animate-spin text-teal-600" /> : <Upload size={14} />}
                    Upload
                    <input type="file" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
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
                  Kirim LPJ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Review / Approve LPJ */}
      {approveRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Verifikasi & Approve LPJ Finance</h3>
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
              <div><strong>Nomor CA:</strong> {approveRow.id_buku}</div>
              <div><strong>Pemegang:</strong> {approveRow.user_input}</div>
              <div><strong>Nominal Dicairkan:</strong> {formatIDR(Number(approveRow.realisasi))}</div>
              <div><strong>Realisasi Dilaporkan:</strong> {formatIDR(Number(approveRow.nominal_lpj || 0))}</div>
              <div>
                <strong>Selisih:</strong>{' '}
                {approveRow.selisih > 0 ? (
                  <span className="text-emerald-700 font-bold">+{formatIDR(approveRow.selisih)} (Sisa Kas Masuk)</span>
                ) : approveRow.selisih < 0 ? (
                  <span className="text-rose-700 font-bold">-{formatIDR(Math.abs(approveRow.selisih))} (Kurang Bayar)</span>
                ) : (
                  <span>Nihil (Rp0)</span>
                )}
              </div>
              {approveRow.bukti_lpj_url && (
                <div className="pt-1">
                  <a href={approveRow.bukti_lpj_url} target="_blank" rel="noreferrer" className="text-teal-600 underline">
                    Lihat Berkas Bukti Lampiran &rarr;
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Dengan menyetujui LPJ ini, sistem akan otomatis menerbitkan <strong>Jurnal Realisasi Beban</strong> serta{' '}
              <strong>Jurnal Penyesuaian Kas Sisa/Kekurangan</strong>.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => handleApproveLpj('reject')}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                Tolak LPJ
              </button>
              <button
                type="button"
                onClick={() => handleApproveLpj('approve')}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Setujui & Jurnal Otomatis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

