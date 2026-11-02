"use client";

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { FileUpload } from '@/components/ui/file-upload';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { BUKTI_JENIS } from '@/lib/penyaluran/request-schema';
import { formatIDR } from '@/lib/format';

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
  const { data: referensi } = useSWR<{ beneficiaries: { id: number; kode_beneficiary: string; nama_lengkap: string }[] }>('/api/penyaluran/referensi', jsonFetcher);
  const [requestId, setRequestId] = useState('');
  const [tgl, setTgl] = useState(() => new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState('');
  const [narasi, setNarasi] = useState('');
  const [penerima, setPenerima] = useState<Penerima[]>([{ beneficiary_id: '', nama_penerima: '', jumlah_diterima: '' }]);
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [urlDraft, setUrlDraft] = useState('');
  const [saving, setSaving] = useState(false);
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
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Entry Penyaluran" description="Catat realisasi pengajuan yang sudah disetujui. Status menjadi disalurkan dan LPJ tersimpan. Jurnal keuangan belum diposting." />
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
          Realisasi sudah tercatat: {formatIDR(Number(saved.lpj.jumlah_realisasi || 0))} pada {String(saved.lpj.tgl_kegiatan).slice(0, 10)}. {saved.bukti?.length || 0} bukti.
        </div>
      )}

      {requestId && !saved?.lpj && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block text-[10px] font-semibold text-slate-500">Tanggal kegiatan</span>
              <input type="date" required className={inputClass} value={tgl} onChange={(e) => setTgl(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-[10px] font-semibold text-slate-500">Jumlah realisasi</span>
              <input required inputMode="numeric" className={inputClass} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Penerima</h2>
              <button type="button" className="text-xs font-medium text-teal-700" onClick={() => setPenerima((rows) => [...rows, { beneficiary_id: '', nama_penerima: '', jumlah_diterima: '' }])}>Tambah penerima</button>
            </div>
            {penerima.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select aria-label="Penerima manfaat" className={inputClass} value={row.beneficiary_id} onChange={(e) => chooseBeneficiary(index, e.target.value)}>
                  <option value="">Tanpa master</option>
                  {(referensi?.beneficiaries ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.kode_beneficiary} — {item.nama_lengkap}</option>
                  ))}
                </select>
                <input aria-label="Nama penerima" className={inputClass} value={row.nama_penerima} onChange={(e) => setPenerima((rows) => rows.map((item, i) => i === index ? { ...item, nama_penerima: e.target.value } : item))} placeholder="Nama penerima" />
                <input aria-label="Jumlah diterima" className={inputClass} value={row.jumlah_diterima} onChange={(e) => setPenerima((rows) => rows.map((item, i) => i === index ? { ...item, jumlah_diterima: e.target.value } : item))} placeholder="Jumlah" />
              </div>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-2 block text-[10px] font-semibold text-slate-500">Narasi LPJ</span>
            <textarea required rows={4} className={inputClass} value={narasi} onChange={(e) => setNarasi(e.target.value)} />
          </label>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Bukti</h2>
            <FileUpload label="Unggah bukti bila penyimpanan Blob tersedia" onChange={(url) => setBukti((rows) => [...rows, { file_url: url, jenis_dokumen: 'foto', caption: '' }])} />
            <div className="flex gap-2">
              <input aria-label="URL bukti" className={inputClass} value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="atau tempel URL bukti" />
              <button type="button" className="rounded-xl border border-slate-200 px-4 text-sm" onClick={() => {
                if (!urlDraft.trim()) return;
                setBukti((rows) => [...rows, { file_url: urlDraft.trim(), jenis_dokumen: 'lainnya', caption: '' }]);
                setUrlDraft('');
              }}>Tambah</button>
            </div>
            {bukti.map((item, index) => (
              <div key={`${item.file_url}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select className={inputClass} value={item.jenis_dokumen} onChange={(e) => setBukti((rows) => rows.map((row, i) => i === index ? { ...row, jenis_dokumen: e.target.value } : row))}>
                  {BUKTI_JENIS.map((jenis) => <option key={jenis} value={jenis}>{jenis}</option>)}
                </select>
                <input className={inputClass} value={item.caption} onChange={(e) => setBukti((rows) => rows.map((row, i) => i === index ? { ...row, caption: e.target.value } : row))} placeholder="Keterangan" />
                <button type="button" className="text-left text-xs text-rose-600" onClick={() => setBukti((rows) => rows.filter((_, i) => i !== index))}>Hapus {item.file_url.slice(0, 40)}</button>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">Simpan realisasi</button>
          </div>
        </form>
      )}
    </div>
  );
}
