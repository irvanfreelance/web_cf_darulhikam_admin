"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { BENEFICIARY_KEPUTUSAN, BENEFICIARY_VERIFIKASI, type Beneficiary } from '@/types/penyaluran';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none';

function text(value: string | number | null | undefined) {
  return value == null ? '' : String(value);
}

export default function VerifikasiDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<Beneficiary>(params?.id ? `/api/penyaluran/beneficiaries/${params.id}` : null, jsonFetcher);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<null | {
    status_verifikasi: string;
    catatan_verifikasi: string;
    verifikasi_tempat_tinggal: string;
    verifikasi_penghasilan: string;
    verifikasi_tanggungan: string;
    verifikasi_aset: string;
    verifikasi_dokumen: string;
    verifikasi_keputusan: string;
  }>(null);

  const current = form ?? (data ? {
    status_verifikasi: data.status_verifikasi,
    catatan_verifikasi: text(data.catatan_verifikasi),
    verifikasi_tempat_tinggal: text(data.verifikasi_tempat_tinggal),
    verifikasi_penghasilan: text(data.verifikasi_penghasilan),
    verifikasi_tanggungan: text(data.verifikasi_tanggungan),
    verifikasi_aset: text(data.verifikasi_aset),
    verifikasi_dokumen: text(data.verifikasi_dokumen),
    verifikasi_keputusan: text(data.verifikasi_keputusan),
  } : null);

  const set = (patch: Partial<NonNullable<typeof current>>) => setForm({ ...(current as NonNullable<typeof current>), ...patch });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!current) return;
    setSaving(true);
    try {
      await sendJson(`/api/penyaluran/beneficiaries/${params.id}/verifikasi`, 'PATCH', {
        ...current,
        verifikasi_penghasilan: current.verifikasi_penghasilan === '' ? null : Number(current.verifikasi_penghasilan),
        verifikasi_tanggungan: current.verifikasi_tanggungan === '' ? null : Number(current.verifikasi_tanggungan),
      });
      toast.success('Hasil verifikasi disimpan');
      setForm(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (error || !data || !current) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error?.message || 'Penerima tidak ditemukan'}</div>;

  return (
    <div className="space-y-6 text-left">
      <a href="/penyaluran/verifikasi" className="text-sm text-slate-500 hover:text-teal-700">Kembali ke antrean</a>
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{data.nama_lengkap}</h1>
        <p className="text-sm text-slate-400">{data.kode_beneficiary} · {data.verified_at ? `Terakhir ${new Date(data.verified_at).toLocaleString('id-ID')} oleh ${data.verified_by || '—'}` : 'Belum diperiksa'}</p>
      </div>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Status</span>
          <select className={inputClass} value={current.status_verifikasi} onChange={(e) => set({ status_verifikasi: e.target.value })}>
            {BENEFICIARY_VERIFIKASI.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Keputusan kelayakan</span>
          <select className={inputClass} value={current.verifikasi_keputusan} onChange={(e) => set({ verifikasi_keputusan: e.target.value })}>
            <option value="">Belum dinilai</option>
            {BENEFICIARY_KEPUTUSAN.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Tempat tinggal</span><textarea rows={2} className={inputClass} value={current.verifikasi_tempat_tinggal} onChange={(e) => set({ verifikasi_tempat_tinggal: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Aset</span><textarea rows={2} className={inputClass} value={current.verifikasi_aset} onChange={(e) => set({ verifikasi_aset: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Penghasilan</span><input className={inputClass} value={current.verifikasi_penghasilan} onChange={(e) => set({ verifikasi_penghasilan: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Tanggungan</span><input className={inputClass} value={current.verifikasi_tanggungan} onChange={(e) => set({ verifikasi_tanggungan: e.target.value })} /></label>
        <label className="md:col-span-2 block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Dokumen</span><textarea rows={2} className={inputClass} value={current.verifikasi_dokumen} onChange={(e) => set({ verifikasi_dokumen: e.target.value })} /></label>
        <label className="md:col-span-2 block text-sm"><span className="mb-2 block text-[10px] font-semibold text-slate-500">Catatan pemeriksa</span><textarea rows={3} className={inputClass} value={current.catatan_verifikasi} onChange={(e) => set({ catatan_verifikasi: e.target.value })} /></label>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">Simpan verifikasi</button>
        </div>
      </form>
    </div>
  );
}
