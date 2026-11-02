"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatWibDate, formatWibDateTime } from '@/lib/wib-date';
import {
  BENEFICIARY_ASNAF,
  BENEFICIARY_EKONOMI,
  BENEFICIARY_KATEGORI,
  BENEFICIARY_KEPUTUSAN,
  BENEFICIARY_VERIFIKASI,
  type Beneficiary,
} from '@/types/penyaluran';

const MapPointPicker = dynamic(() => import('@/components/admin/map-point-picker'), {
  ssr: false,
  loading: () => <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">Memuat peta...</div>,
});

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-teal-500';

const DEFAULT_LAT = -6.9175;
const DEFAULT_LNG = 107.6191;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-[10px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function num(value: string | number | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function day(value: unknown) {
  return formatWibDate(value);
}

function text(value: string | number | null | undefined) {
  return value == null ? '' : String(value);
}

export default function BeneficiaryForm({ initial }: { initial?: Beneficiary }) {
  const router = useRouter();
  const { data: campaigns } = useSWR<{ id: number; title: string }[]>('/api/campaigns?minimal=true', jsonFetcher);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    num(initial?.latitude) != null && num(initial?.longitude) != null
      ? { lat: num(initial?.latitude) as number, lng: num(initial?.longitude) as number }
      : null
  );
  const [form, setForm] = useState({
    kode_beneficiary: text(initial?.kode_beneficiary),
    nama_lengkap: text(initial?.nama_lengkap),
    nik: text(initial?.nik),
    nomor_kk: text(initial?.nomor_kk),
    tempat_lahir: text(initial?.tempat_lahir),
    tgl_lahir: day(initial?.tgl_lahir),
    jenis_kelamin: text(initial?.jenis_kelamin),
    alamat: text(initial?.alamat),
    rt: text(initial?.rt),
    rw: text(initial?.rw),
    kelurahan: text(initial?.kelurahan),
    kecamatan: text(initial?.kecamatan),
    kabupaten: text(initial?.kabupaten),
    provinsi: text(initial?.provinsi),
    kontak: text(initial?.kontak),
    handphone: text(initial?.handphone),
    email: text(initial?.email),
    kategori: String(initial?.kategori ?? 'individu'),
    status_ekonomi: String(initial?.status_ekonomi ?? 'miskin'),
    jumlah_anggota_keluarga: text(initial?.jumlah_anggota_keluarga),
    asnaf: text(initial?.asnaf),
    foto_ktp_url: text(initial?.foto_ktp_url),
    foto_kk_url: text(initial?.foto_kk_url),
    foto_rumah_url: text(initial?.foto_rumah_url),
    status_verifikasi: String(initial?.status_verifikasi ?? 'unverified'),
    catatan_verifikasi: text(initial?.catatan_verifikasi),
    verifikasi_tempat_tinggal: text(initial?.verifikasi_tempat_tinggal),
    verifikasi_penghasilan: text(initial?.verifikasi_penghasilan),
    verifikasi_tanggungan: text(initial?.verifikasi_tanggungan),
    verifikasi_aset: text(initial?.verifikasi_aset),
    verifikasi_dokumen: text(initial?.verifikasi_dokumen),
    verifikasi_keputusan: text(initial?.verifikasi_keputusan),
    campaign_id: initial?.campaign_id ? String(initial.campaign_id) : '',
  });

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      kode_beneficiary: initial ? form.kode_beneficiary : form.kode_beneficiary || null,
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null,
      campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
      jumlah_anggota_keluarga: form.jumlah_anggota_keluarga === '' ? null : Number(form.jumlah_anggota_keluarga),
      verifikasi_penghasilan: form.verifikasi_penghasilan === '' ? null : Number(form.verifikasi_penghasilan),
      verifikasi_tanggungan: form.verifikasi_tanggungan === '' ? null : Number(form.verifikasi_tanggungan),
    };
    try {
      if (initial) {
        await sendJson(`/api/penyaluran/beneficiaries/${initial.id}`, 'PATCH', payload);
        toast.success('Penerima manfaat diperbarui');
        router.refresh();
      } else {
        const created = await sendJson('/api/penyaluran/beneficiaries', 'POST', payload);
        toast.success('Penerima manfaat ditambahkan');
        router.push(`/penyaluran/penerima-manfaat/${created.id}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold text-slate-800">Identitas</h2>
        <Field label="Kode">
          <input maxLength={20} className={inputClass} placeholder="Kosongkan untuk BNF-tahun-urut" value={form.kode_beneficiary} onChange={(e) => set({ kode_beneficiary: e.target.value })} />
        </Field>
        <Field label="Nama lengkap">
          <input required minLength={3} maxLength={200} className={inputClass} value={form.nama_lengkap} onChange={(e) => set({ nama_lengkap: e.target.value })} />
        </Field>
        <Field label="NIK">
          <input inputMode="numeric" maxLength={16} className={inputClass} value={form.nik} onChange={(e) => set({ nik: e.target.value })} />
        </Field>
        <Field label="Nomor KK">
          <input maxLength={16} className={inputClass} value={form.nomor_kk} onChange={(e) => set({ nomor_kk: e.target.value })} />
        </Field>
        <Field label="Tempat lahir">
          <input className={inputClass} value={form.tempat_lahir} onChange={(e) => set({ tempat_lahir: e.target.value })} />
        </Field>
        <Field label="Tanggal lahir">
          <input type="date" className={inputClass} value={form.tgl_lahir} onChange={(e) => set({ tgl_lahir: e.target.value })} />
        </Field>
        <Field label="Jenis kelamin">
          <select className={inputClass} value={form.jenis_kelamin} onChange={(e) => set({ jenis_kelamin: e.target.value })}>
            <option value="">Tidak diisi</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </Field>
        <Field label="Kategori">
          <select className={inputClass} value={form.kategori} onChange={(e) => set({ kategori: e.target.value })}>
            {BENEFICIARY_KATEGORI.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status ekonomi">
          <select className={inputClass} value={form.status_ekonomi} onChange={(e) => set({ status_ekonomi: e.target.value })}>
            {BENEFICIARY_EKONOMI.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Asnaf">
          <select className={inputClass} value={form.asnaf} onChange={(e) => set({ asnaf: e.target.value })}>
            <option value="">Tidak diisi</option>
            {BENEFICIARY_ASNAF.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Telepon">
          <input maxLength={20} className={inputClass} value={form.kontak} onChange={(e) => set({ kontak: e.target.value })} />
        </Field>
        <Field label="Handphone">
          <input maxLength={20} className={inputClass} value={form.handphone} onChange={(e) => set({ handphone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Jumlah anggota keluarga">
          <input inputMode="numeric" className={inputClass} value={form.jumlah_anggota_keluarga} onChange={(e) => set({ jumlah_anggota_keluarga: e.target.value })} />
        </Field>
        <Field label="Kampanye terkait">
          <select className={inputClass} value={form.campaign_id} onChange={(e) => set({ campaign_id: e.target.value })}>
            <option value="">Tidak ditautkan</option>
            {(campaigns ?? []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
            ))}
          </select>
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold text-slate-800">Wilayah</h2>
        <div className="md:col-span-2">
          <Field label="Alamat">
            <textarea rows={3} className={inputClass} value={form.alamat} onChange={(e) => set({ alamat: e.target.value })} />
          </Field>
        </div>
        <Field label="RT"><input maxLength={4} className={inputClass} value={form.rt} onChange={(e) => set({ rt: e.target.value })} /></Field>
        <Field label="RW"><input maxLength={4} className={inputClass} value={form.rw} onChange={(e) => set({ rw: e.target.value })} /></Field>
        <Field label="Kelurahan"><input className={inputClass} value={form.kelurahan} onChange={(e) => set({ kelurahan: e.target.value })} /></Field>
        <Field label="Kecamatan"><input className={inputClass} value={form.kecamatan} onChange={(e) => set({ kecamatan: e.target.value })} /></Field>
        <Field label="Kabupaten"><input className={inputClass} value={form.kabupaten} onChange={(e) => set({ kabupaten: e.target.value })} /></Field>
        <Field label="Provinsi"><input className={inputClass} value={form.provinsi} onChange={(e) => set({ provinsi: e.target.value })} /></Field>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Koordinat</h2>
          {pin && (
            <button type="button" className="text-xs font-medium text-rose-600" onClick={() => setPin(null)}>
              Hapus koordinat
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Klik atau geser penanda untuk menyimpan latitude dan longitude. Sebelum itu koordinat tidak ditulis.
          Tampilan awal peta berada di Bandung dan bukan nilai tersimpan.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div>Latitude: {pin ? pin.lat.toFixed(7) : '—'}</div>
          <div>Longitude: {pin ? pin.lng.toFixed(7) : '—'}</div>
        </div>
        <MapPointPicker
          lat={pin?.lat ?? DEFAULT_LAT}
          lng={pin?.lng ?? DEFAULT_LNG}
          onChange={(lat, lng) => setPin({ lat, lng })}
          className="h-[280px]"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold text-slate-800">Verifikasi kelayakan</h2>
        <Field label="Status verifikasi">
          <select className={inputClass} value={form.status_verifikasi} onChange={(e) => set({ status_verifikasi: e.target.value })}>
            {BENEFICIARY_VERIFIKASI.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Keputusan">
          <select className={inputClass} value={form.verifikasi_keputusan} onChange={(e) => set({ verifikasi_keputusan: e.target.value })}>
            <option value="">Belum dinilai</option>
            {BENEFICIARY_KEPUTUSAN.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Tempat tinggal">
          <textarea rows={2} className={inputClass} value={form.verifikasi_tempat_tinggal} onChange={(e) => set({ verifikasi_tempat_tinggal: e.target.value })} />
        </Field>
        <Field label="Aset">
          <textarea rows={2} className={inputClass} value={form.verifikasi_aset} onChange={(e) => set({ verifikasi_aset: e.target.value })} />
        </Field>
        <Field label="Penghasilan">
          <input inputMode="decimal" className={inputClass} value={form.verifikasi_penghasilan} onChange={(e) => set({ verifikasi_penghasilan: e.target.value })} />
        </Field>
        <Field label="Tanggungan">
          <input inputMode="numeric" className={inputClass} value={form.verifikasi_tanggungan} onChange={(e) => set({ verifikasi_tanggungan: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Dokumen">
            <textarea rows={2} className={inputClass} value={form.verifikasi_dokumen} onChange={(e) => set({ verifikasi_dokumen: e.target.value })} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Catatan verifikasi">
            <textarea rows={2} className={inputClass} value={form.catatan_verifikasi} onChange={(e) => set({ catatan_verifikasi: e.target.value })} />
          </Field>
        </div>
        {initial?.verified_at && (
          <p className="md:col-span-2 text-xs text-slate-500">
            Diverifikasi {formatWibDateTime(initial.verified_at)} oleh {initial.verified_by || '—'}
          </p>
        )}
        <Field label="URL foto KTP"><input className={inputClass} value={form.foto_ktp_url} onChange={(e) => set({ foto_ktp_url: e.target.value })} /></Field>
        <Field label="URL foto KK"><input className={inputClass} value={form.foto_kk_url} onChange={(e) => set({ foto_kk_url: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <Field label="URL foto rumah"><input className={inputClass} value={form.foto_rumah_url} onChange={(e) => set({ foto_rumah_url: e.target.value })} /></Field>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/20 disabled:opacity-60">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Simpan penerima
        </button>
      </div>
    </form>
  );
}
