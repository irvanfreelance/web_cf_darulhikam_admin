"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import type { CrmDonor, CrmKantor, CrmTeam } from '@/types/crm';
import { DONOR_JENIS } from '@/types/crm';

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-teal-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-[10px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

async function optionalList(url: string) {
  try {
    return await jsonFetcher(url);
  } catch {
    return [];
  }
}

function text(value: string | null | undefined) {
  return value ?? '';
}

export default function CrmDonorForm({ donor, onSaved }: { donor?: CrmDonor; onSaved?: () => void }) {
  const router = useRouter();
  const { data: teams } = useSWR<CrmTeam[]>('/api/crm/teams', optionalList);
  const { data: offices } = useSWR<CrmKantor[]>('/api/crm/kantor', optionalList);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: donor?.name ?? '',
    email: text(donor?.email),
    phone: text(donor?.phone),
    jenis: donor?.jenis ?? 'perorangan',
    jenis_kelamin: donor?.jenis_kelamin ?? '',
    alamat: text(donor?.alamat),
    nik: text(donor?.nik),
    status_aktif: donor?.status_aktif ?? true,
    kantor_id: donor?.kantor_id ? String(donor.kantor_id) : '',
    tim_crm_id: donor?.tim_crm_id ? String(donor.tim_crm_id) : '',
    minat_program: text(donor?.minat_program),
    terverifikasi: Boolean(donor?.verified_at),
  });

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      kantor_id: form.kantor_id ? Number(form.kantor_id) : null,
      tim_crm_id: form.tim_crm_id ? Number(form.tim_crm_id) : null,
    };
    try {
      if (donor) {
        await sendJson(`/api/crm/donors/${donor.id}`, 'PATCH', payload);
        toast.success('Profil CRM diperbarui');
        onSaved?.();
      } else {
        const created = await sendJson('/api/crm/donors', 'POST', payload);
        toast.success('Donatur baru ditambahkan');
        router.push(`/crm/donors/${created.id}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Nama lengkap">
          <input required minLength={3} maxLength={150} className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Jenis donatur">
          <select className={inputClass} value={form.jenis} onChange={(e) => set({ jenis: e.target.value as typeof form.jenis })}>
            {DONOR_JENIS.map((jenis) => (
              <option key={jenis} value={jenis}>{jenis}</option>
            ))}
          </select>
        </Field>
        <Field label="Email">
          <input type="email" maxLength={150} className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Telepon">
          <input maxLength={20} className={inputClass} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Jenis kelamin">
          <select className={inputClass} value={form.jenis_kelamin} onChange={(e) => set({ jenis_kelamin: e.target.value })}>
            <option value="">Tidak diisi</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </Field>
        <Field label="NIK">
          <input inputMode="numeric" maxLength={16} className={inputClass} value={form.nik} onChange={(e) => set({ nik: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Alamat">
            <textarea rows={3} className={inputClass} value={form.alamat} onChange={(e) => set({ alamat: e.target.value })} />
          </Field>
        </div>
        <Field label="Kantor">
          {offices === undefined ? (
            <select disabled className={inputClass}><option>Memuat kantor...</option></select>
          ) : offices.length > 0 ? (
            <select className={inputClass} value={form.kantor_id} onChange={(e) => set({ kantor_id: e.target.value })}>
              <option value="">Tidak dipilih</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>{office.nama}</option>
              ))}
            </select>
          ) : (
            <input inputMode="numeric" className={inputClass} placeholder="ID kantor, kosongkan bila tidak ada" value={form.kantor_id} onChange={(e) => set({ kantor_id: e.target.value.replace(/\D/g, '') })} />
          )}
        </Field>
        <Field label="Tim CRM">
          <select className={inputClass} value={form.tim_crm_id} onChange={(e) => set({ tim_crm_id: e.target.value })}>
            <option value="">Tidak dipilih</option>
            {(teams ?? []).map((team) => (
              <option key={team.id} value={team.id}>{team.nama}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Minat program">
            <input className={inputClass} value={form.minat_program} onChange={(e) => set({ minat_program: e.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.status_aktif} onChange={(e) => set({ status_aktif: e.target.checked })} />
          Status aktif
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.terverifikasi} onChange={(e) => set({ terverifikasi: e.target.checked })} />
          Tandai terverifikasi
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/20 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Simpan profil
        </button>
      </div>
    </form>
  );
}
