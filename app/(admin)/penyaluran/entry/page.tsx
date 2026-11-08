"use client";

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { FileUpload } from '@/components/ui/file-upload';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { BUKTI_JENIS } from '@/lib/penyaluran/request-schema';
import { formatIDR } from '@/lib/format';
import { formatWibDate, todayWib } from '@/lib/wib-date';
import { UserPlus, Plus, Trash2, X } from 'lucide-react';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none';

type RequestRow = {
  id: number;
  nomor_pengajuan: string;
  judul: string;
  status: string;
  jumlah_diajukan: string | number;
  jumlah_disetujui: string | number | null;
  beneficiary_id: number | null;
  beneficiary_nama: string | null;
};

type Penerima = { beneficiary_id: string; nama_penerima: string; jumlah_diterima: string };
type Bukti = { file_url: string; jenis_dokumen: string; caption: string };

export default function EntryPenyaluranPage() {
  const { data: approved } = useSWR<{ rows: RequestRow[] }>('/api/penyaluran/requests?status=approved&limit=100', jsonFetcher);
  const { data: referensi, mutate: mutateRef } = useSWR<{ beneficiaries: { id: number; kode_beneficiary: string; nama_lengkap: string }[] }>('/api/penyaluran/referensi', jsonFetcher);

  const [requestId, setRequestId] = useState('');
  const [tgl, setTgl] = useState(() => todayWib());
  const [jumlah, setJumlah] = useState('');
  const [narasi, setNarasi] = useState('');
  const [penerima, setPenerima] = useState<Penerima[]>([{ beneficiary_id: '', nama_penerima: '', jumlah_diterima: '' }]);
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [urlDraft, setUrlDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick Add Modal State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickIndex, setQuickIndex] = useState<number | null>(null);
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickKategori, setQuickKategori] = useState<'individu' | 'lembaga'>('individu');
  const [quickAsnaf, setQuickAsnaf] = useState('fakir');
  const [quickSaving, setQuickSaving] = useState(false);

  const { data: saved, mutate } = useSWR(requestId ? `/api/penyaluran/requests/${requestId}/realisasi` : null, jsonFetcher);
  const selected = approved?.rows?.find((row) => String(row.id) === requestId);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('request');
    if (id) setRequestId(id);
  }, []);

  useEffect(() => {
    if (!selected || saved?.lpj) return;
    const nominal = String(selected.jumlah_disetujui || selected.jumlah_diajukan || '');
    setJumlah(nominal);
    setPenerima([{
      beneficiary_id: selected.beneficiary_id ? String(selected.beneficiary_id) : '',
      nama_penerima: selected.beneficiary_nama || '',
      jumlah_diterima: nominal,
    }]);
  }, [selected?.id, saved?.lpj]);

  const chooseBeneficiary = (index: number, beneficiaryId: string) => {
    const match = referensi?.beneficiaries.find((row) => String(row.id) === beneficiaryId);
    setPenerima((rows) => rows.map((row, i) => i === index ? {
      ...row,
      beneficiary_id: beneficiaryId,
      nama_penerima: match?.nama_lengkap || row.nama_penerima,
    } : row));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNama.trim()) return;
    setQuickSaving(true);
    try {
      const res = await sendJson('/api/penyaluran/beneficiaries', 'POST', {
        nama_lengkap: quickNama.trim(),
        nik: quickNik.trim() || null,
        kategori: quickKategori,
        asnaf: quickAsnaf,
        status_verifikasi: 'unverified',
      });
      toast.success('Penerima manfaat baru berhasil didaftarkan');
      await mutateRef();
      if (quickIndex !== null) {
        setPenerima((rows) => rows.map((row, i) => i === quickIndex ? {
          ...row,
          beneficiary_id: String(res.id),
          nama_penerima: res.nama_lengkap,
        } : row));
      }
      setShowQuickAdd(false);
      setQuickNama('');
      setQuickNik('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan PM');
    } finally {
      setQuickSaving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestId) return;
    setSaving(true);
    try {
      await sendJson(`/api/penyaluran/requests/${requestId}/realisasi`, 'POST', {
        jumlah_realisasi: Number(jumlah),
        tgl_kegiatan: tgl,
        narasi,
        penerima: penerima.map((row) => ({
          beneficiary_id: row.beneficiary_id ? Number(row.beneficiary_id) : null,
          nama_penerima: row.nama_penerima,
          jumlah_diterima: Number(row.jumlah_diterima),
        })),
        bukti,
      });
      toast.success('Realisasi dan LPJ tersimpan. Belum masuk jurnal.');
      mutate();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan realisasi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Entry Penyaluran"
        description="Catat realisasi pengajuan yang sudah disetujui. Status menjadi disalurkan dan LPJ tersimpan."
      />

      <label className="block rounded-2xl border border-slate-100 bg-white p-4 text-sm">
        <span className="mb-2 block text-[10px] font-semibold text-slate-500">Pengajuan disetujui</span>
        <select className={inputClass} value={requestId} onChange={(e) => setRequestId(e.target.value)}>
          <option value="">Pilih pengajuan</option>
          {(approved?.rows ?? []).map((row) => (
            <option key={row.id} value={row.id}>{row.nomor_pengajuan} — {row.judul}</option>
          ))}
        </select>
      </label>

      {saved?.lpj && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          Realisasi sudah tercatat: {formatIDR(Number(saved.lpj.jumlah_realisasi || 0))} pada {formatWibDate(saved.lpj.tgl_kegiatan) || '—'}. {saved.bukti?.length || 0} bukti.
        </div>
      )}

      {requestId && !saved?.lpj && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block text-[10px] font-semibold text-slate-500">Tanggal kegiatan (Back-date diperbolehkan)</span>
              <input type="date" required className={inputClass} value={tgl} onChange={(e) => setTgl(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-[10px] font-semibold text-slate-500">Jumlah realisasi</span>
              <input required inputMode="numeric" className={inputClass} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Penerima Manfaat</h2>
              <button
                type="button"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                onClick={() => setPenerima((rows) => [...rows, { beneficiary_id: '', nama_penerima: '', jumlah_diterima: '' }])}
              >
                + Tambah Baris
              </button>
            </div>

            {penerima.map((row, index) => (
              <div key={index} className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex-1 w-full">
                  <select
                    aria-label="Penerima manfaat"
                    className={inputClass}
                    value={row.beneficiary_id}
                    onChange={(e) => chooseBeneficiary(index, e.target.value)}
                  >
                    <option value="">Pilih dari Master PM</option>
                    {(referensi?.beneficiaries ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.kode_beneficiary} — {item.nama_lengkap}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  title="Tambah PM Cepat"
                  onClick={() => {
                    setQuickIndex(index);
                    setShowQuickAdd(true);
                  }}
                  className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-teal-700 hover:bg-teal-100"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <div className="flex-1 w-full">
                  <input
                    aria-label="Nama penerima"
                    className={inputClass}
                    value={row.nama_penerima}
                    onChange={(e) => setPenerima((rows) => rows.map((item, i) => i === index ? { ...item, nama_penerima: e.target.value } : item))}
                    placeholder="Nama penerima"
                  />
                </div>
                <div className="w-full md:w-40">
                  <input
                    aria-label="Jumlah diterima"
                    className={inputClass}
                    value={row.jumlah_diterima}
                    onChange={(e) => setPenerima((rows) => rows.map((item, i) => i === index ? { ...item, jumlah_diterima: e.target.value } : item))}
                    placeholder="Jumlah"
                  />
                </div>
                {penerima.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPenerima((rows) => rows.filter((_, i) => i !== index))}
                    className="p-2 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <label className="block text-sm">
            <span className="mb-2 block text-[10px] font-semibold text-slate-500">Narasi LPJ</span>
            <textarea required rows={4} className={inputClass} value={narasi} onChange={(e) => setNarasi(e.target.value)} />
          </label>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Bukti Lapangan</h2>
            <FileUpload
              label="Unggah berkas bukti penyaluran"
              onChange={(url) => setBukti((rows) => [...rows, { file_url: url, jenis_dokumen: 'foto', caption: '' }])}
            />
            <div className="flex gap-2">
              <input
                aria-label="URL bukti"
                className={inputClass}
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="atau tempel URL bukti eksternal"
              />
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
                onClick={() => {
                  if (!urlDraft.trim()) return;
                  setBukti((rows) => [...rows, { file_url: urlDraft.trim(), jenis_dokumen: 'lainnya', caption: '' }]);
                  setUrlDraft('');
                }}
              >
                Tambah
              </button>
            </div>
            {bukti.map((item, index) => (
              <div key={`${item.file_url}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select className={inputClass} value={item.jenis_dokumen} onChange={(e) => setBukti((rows) => rows.map((row, i) => i === index ? { ...row, jenis_dokumen: e.target.value } : row))}>
                  {BUKTI_JENIS.map((jenis) => <option key={jenis} value={jenis}>{jenis}</option>)}
                </select>
                <input className={inputClass} value={item.caption} onChange={(e) => setBukti((rows) => rows.map((row, i) => i === index ? { ...row, caption: e.target.value } : row))} placeholder="Keterangan" />
                <button type="button" className="text-left text-xs text-rose-600" onClick={() => setBukti((rows) => rows.filter((_, i) => i !== index))}>Hapus</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan Realisasi'}
            </button>
          </div>
        </form>
      )}

      {/* Modal Quick-Add PM */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-800">Tambah Penerima Manfaat Cepat</h3>
              </div>
              <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Lengkap *</label>
                <input
                  required
                  placeholder="Contoh: Budi Santoso"
                  className={inputClass}
                  value={quickNama}
                  onChange={(e) => setQuickNama(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">NIK (16 Digit)</label>
                <input
                  placeholder="3204..."
                  className={inputClass}
                  value={quickNik}
                  onChange={(e) => setQuickNik(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori</label>
                  <select
                    className={inputClass}
                    value={quickKategori}
                    onChange={(e: any) => setQuickKategori(e.target.value)}
                  >
                    <option value="individu">Individu</option>
                    <option value="lembaga">Lembaga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Golongan Asnaf</label>
                  <select
                    className={inputClass}
                    value={quickAsnaf}
                    onChange={(e) => setQuickAsnaf(e.target.value)}
                  >
                    <option value="fakir">Fakir</option>
                    <option value="miskin">Miskin</option>
                    <option value="amil">Amil</option>
                    <option value="mualaf">Mualaf</option>
                    <option value="riqab">Riqab</option>
                    <option value="gharimin">Gharimin</option>
                    <option value="fisabilillah">Fisabilillah</option>
                    <option value="ibnu_sabil">Ibnu Sabil</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {quickSaving ? 'Menyimpan...' : 'Simpan & Pilih'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
