"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function DetailPengajuanPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR(params?.id ? `/api/penyaluran/requests/${params.id}` : null, jsonFetcher);
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (action: 'approve' | 'reject' | 'submit') => {
    setBusy(true);
    try {
      await sendJson(`/api/penyaluran/requests/${params.id}`, 'PATCH', { action, catatan: catatan || null });
      toast.success('Status diperbarui');
      setCatatan('');
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui status');
    } finally {
      setBusy(false);
    }
  };

  const journal = async (action: 'post' | 'reverse') => {
    setBusy(true);
    try {
      const result = await sendJson(`/api/penyaluran/requests/${params.id}/jurnal`, 'POST', { action });
      toast.success(result.already ? 'Jurnal sudah ada, tidak diposting ulang' : action === 'post' ? 'Jurnal pencairan tersimpan' : 'Jurnal balik tersimpan');
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menjurnal');
    } finally {
      setBusy(false);
    }
  };

  const posted = data?.fins_trans_id != null && String(data.fins_trans_id) !== '';

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (error || !data) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error?.message || 'Pengajuan tidak ditemukan'}</div>;

  return (
    <div className="space-y-6 text-left">
      <a href="/penyaluran/daftar" className="text-sm text-slate-500 hover:text-teal-700">Kembali ke daftar</a>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">{data.nomor_pengajuan}</p>
        <h1 className="text-2xl font-semibold text-slate-800">{data.judul}</h1>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-slate-400">Status</dt><dd>{data.status}</dd></div>
          <div><dt className="text-slate-400">Jenis</dt><dd>{data.jenis_penyaluran}</dd></div>
          <div><dt className="text-slate-400">Kampanye</dt><dd>{data.campaign_title || data.campaign_id}</dd></div>
          <div><dt className="text-slate-400">Penerima</dt><dd>{data.beneficiary_nama ? `${data.kode_beneficiary} — ${data.beneficiary_nama}` : '—'}</dd></div>
          <div><dt className="text-slate-400">Diajukan</dt><dd>{formatIDR(Number(data.jumlah_diajukan || 0))}</dd></div>
          <div><dt className="text-slate-400">Disetujui</dt><dd>{data.jumlah_disetujui == null ? '—' : formatIDR(Number(data.jumlah_disetujui))}</dd></div>
          <div><dt className="text-slate-400">COA</dt><dd>{data.coa_debet} / {data.coa_kredit}</dd></div>
          <div><dt className="text-slate-400">Pengaju / penentu</dt><dd>{data.nik_pengaju}{data.nik_approver ? ` / ${data.nik_approver}` : ''}</dd></div>
          <div className="md:col-span-2"><dt className="text-slate-400">Deskripsi</dt><dd>{data.deskripsi || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-slate-400">Catatan keputusan</dt><dd>{data.catatan_approver || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-slate-400">Jurnal</dt><dd>{posted ? (data.jurnal_nomor || data.fins_trans_id) : 'Belum dijurnal'}{data.jurnal_balik_nomor ? ` · balik ${data.jurnal_balik_nomor}` : ''}</dd></div>
        </dl>
        <div className="mt-6 space-y-3">
          <textarea aria-label="Catatan keputusan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan, wajib bila menolak" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            {['submitted', 'reviewed'].includes(data.status) && <button type="button" disabled={busy} onClick={() => act('approve')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white">Setujui</button>}
            {['draft', 'submitted', 'reviewed'].includes(data.status) && <button type="button" disabled={busy} onClick={() => act('reject')} className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white">Tolak</button>}
            {['draft', 'rejected'].includes(data.status) && <button type="button" disabled={busy} onClick={() => act('submit')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Ajukan</button>}
            {['approved', 'disbursed'].includes(data.status) && !posted && <button type="button" disabled={busy} onClick={() => journal('post')} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">Cairkan</button>}
            {posted && !data.fins_reversal_trans_id && <button type="button" disabled={busy} onClick={() => journal('reverse')} className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-700">Jurnal balik</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
