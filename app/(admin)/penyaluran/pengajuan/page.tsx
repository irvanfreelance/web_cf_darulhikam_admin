"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { JENIS_PENYALURAN } from '@/lib/penyaluran/request-schema';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none';

type Referensi = {
  campaigns: { id: number; title: string }[];
  beneficiaries: { id: number; kode_beneficiary: string; nama_lengkap: string; status_verifikasi: string }[];
  programs: { id: number; kode: string; nama: string; campaign_id: number | null; dp_percent: string | number | null }[];
  coa: { coa: string; nama_coa: string }[];
  campaignCoa?: { campaign_id: number; coa_expense: string | null; coa_fund: string | null; coa_receipt: string | null }[];
};

export default function PengajuanPenyaluranPage() {
  const router = useRouter();
  const { data } = useSWR<Referensi>('/api/penyaluran/referensi', jsonFetcher);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    judul: '',
    deskripsi: '',
    program_id: '',
    campaign_id: '',
    beneficiary_id: '',
    jenis_penyaluran: 'tunai',
    jumlah_diajukan: '',
    coa_debet: '',
    coa_kredit: '',
  });

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const coaFor = (campaignId: string) => data?.campaignCoa?.find((row) => String(row.campaign_id) === campaignId);

  const applyCampaign = (campaignId: string, programId = form.program_id) => {
    const mapping = coaFor(campaignId);
    set({
      program_id: programId,
      campaign_id: campaignId,
      ...(mapping?.coa_expense ? { coa_debet: mapping.coa_expense } : {}),
      ...(mapping?.coa_fund ? { coa_kredit: mapping.coa_fund } : {}),
    });
  };

  const onProgram = (programId: string) => {
    const program = data?.programs.find((item) => String(item.id) === programId);
    applyCampaign(program?.campaign_id ? String(program.campaign_id) : form.campaign_id, programId);
  };

  const submit = async (ajukan: boolean) => {
    setSaving(true);
    try {
      const created = await sendJson('/api/penyaluran/requests', 'POST', {
        ...form,
        jumlah_diajukan: form.jumlah_diajukan === '' ? 0 : Number(form.jumlah_diajukan),
        campaign_id: form.campaign_id ? Number(form.campaign_id) : '',
        beneficiary_id: form.beneficiary_id ? Number(form.beneficiary_id) : null,
        ajukan,
      });
      toast.success(ajukan ? 'Pengajuan dikirim' : 'Draf tersimpan');
      router.push(`/penyaluran/daftar/${created.id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan pengajuan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Pengajuan Penyaluran" description="Menghubungkan penerima manfaat dan program kampanye. Belum mencairkan dana." />
      <form
        className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-2"
        onSubmit={(event) => { event.preventDefault(); submit(true); }}
      >
        <label className="md:col-span-2 block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Judul</span>
          <input required className={inputClass} value={form.judul} onChange={(e) => set({ judul: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Program FINS</span>
          <select className={inputClass} value={form.program_id} onChange={(e) => onProgram(e.target.value)}>
            <option value="">Tidak dipilih</option>
            {(data?.programs ?? []).map((program) => (
              <option key={program.id} value={program.id}>{program.kode} — {program.nama}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Kampanye</span>
          <select required className={inputClass} value={form.campaign_id} onChange={(e) => applyCampaign(e.target.value)}>
            <option value="">Pilih kampanye</option>
            {(data?.campaigns ?? []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Penerima manfaat</span>
          <select className={inputClass} value={form.beneficiary_id} onChange={(e) => set({ beneficiary_id: e.target.value })}>
            <option value="">Tidak ditautkan</option>
            {(data?.beneficiaries ?? []).map((row) => (
              <option key={row.id} value={row.id}>{row.kode_beneficiary} — {row.nama_lengkap} ({row.status_verifikasi})</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Jenis</span>
          <select className={inputClass} value={form.jenis_penyaluran} onChange={(e) => set({ jenis_penyaluran: e.target.value })}>
            {JENIS_PENYALURAN.map((jenis) => <option key={jenis} value={jenis}>{jenis}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Jumlah diajukan</span>
          <input required inputMode="numeric" className={inputClass} value={form.jumlah_diajukan} onChange={(e) => set({ jumlah_diajukan: e.target.value })} />
        </label>
        <p className="md:col-span-2 text-xs text-slate-400">COA terisi dari pemetaan kampanye bila ada: debet = COA penyaluran, kredit = COA dana. Keduanya tetap bisa diubah.</p>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">COA debet</span>
          <select className={inputClass} value={form.coa_debet} onChange={(e) => set({ coa_debet: e.target.value })}>
            <option value="">Pilih COA</option>
            {form.coa_debet && !(data?.coa ?? []).some((row) => row.coa === form.coa_debet) && (
              <option value={form.coa_debet}>{form.coa_debet} — dari kampanye</option>
            )}
            {(data?.coa ?? []).map((row) => <option key={row.coa} value={row.coa}>{row.coa} — {row.nama_coa}</option>)}
          </select>
          {(data?.coa ?? []).length === 0 && (
            <input className={`${inputClass} mt-2`} placeholder="Ketik kode COA" value={form.coa_debet} onChange={(e) => set({ coa_debet: e.target.value })} />
          )}
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">COA kredit</span>
          <select className={inputClass} value={form.coa_kredit} onChange={(e) => set({ coa_kredit: e.target.value })}>
            <option value="">Pilih COA</option>
            {form.coa_kredit && !(data?.coa ?? []).some((row) => row.coa === form.coa_kredit) && (
              <option value={form.coa_kredit}>{form.coa_kredit} — dari kampanye</option>
            )}
            {(data?.coa ?? []).map((row) => <option key={`k-${row.coa}`} value={row.coa}>{row.coa} — {row.nama_coa}</option>)}
          </select>
          {(data?.coa ?? []).length === 0 && (
            <input className={`${inputClass} mt-2`} placeholder="Ketik kode COA" value={form.coa_kredit} onChange={(e) => set({ coa_kredit: e.target.value })} />
          )}
        </label>
        <label className="md:col-span-2 block text-sm">
          <span className="mb-2 block text-[10px] font-semibold text-slate-500">Deskripsi</span>
          <textarea rows={3} className={inputClass} value={form.deskripsi} onChange={(e) => set({ deskripsi: e.target.value })} />
        </label>
        <div className="md:col-span-2 flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={() => submit(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:opacity-60">
            Simpan draf
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Ajukan
          </button>
        </div>
      </form>
    </div>
  );
}
