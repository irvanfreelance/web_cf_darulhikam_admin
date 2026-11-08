"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDate } from '@/lib/wib-date';
import { ClipboardCheck, FileText, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export default function LpjDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data, error, isLoading, mutate } = useSWR(`/api/penyaluran/lpj/${id}`, jsonFetcher);

  const [action, setAction] = useState<'approve' | 'revisi'>('approve');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lpj = data?.lpj;
  const proofs = data?.proofs || [];
  const recipients = data?.recipients || [];

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendJson(`/api/penyaluran/lpj/${id}`, 'PATCH', {
        action,
        catatan_review: catatan || null,
      });
      toast.success(action === 'approve' ? 'LPJ berhasil disetujui (Approved)' : 'Catatan revisi dikirimkan');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/penyaluran/pertanggungjawaban')}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title={`Detail LPJ: ${lpj?.judul || 'Penyaluran'}`}
          description={`Pengajuan: ${lpj?.nomor_pengajuan || '—'} • Program: ${lpj?.campaign_title || 'Umum'}`}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {isLoading && <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />}

      {lpj && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Rincian Kegiatan & Berkas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Kartu Ringkasan Realisasi */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 border-b pb-2">Informasi Realisasi</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Jumlah Disetujui</span>
                  <span className="text-sm font-bold text-slate-700">{formatIDR(lpj.jumlah_disetujui)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Jumlah Realisasi</span>
                  <span className="text-base font-bold text-teal-800">{formatIDR(lpj.jumlah_realisasi)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tanggal Kegiatan</span>
                  <span className="text-sm font-medium text-slate-800">{formatWibDate(lpj.tgl_kegiatan)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Narasi Kegiatan</span>
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {lpj.narasi || 'Tidak ada narasi kegiatan.'}
                </p>
              </div>
            </div>

            {/* Dokumen Bukti Realisasi */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 border-b pb-2">
                Dokumen Bukti Lapangan ({proofs.length})
              </h2>
              {proofs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada berkas bukti diunggah.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {proofs.map((p: any) => (
                    <a
                      key={p.id}
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 truncate">{p.caption || p.jenis_dokumen}</p>
                          <p className="text-[10px] text-slate-400">{p.jenis_dokumen.toUpperCase()}</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Daftar Penerima Manfaat */}
            {recipients.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-slate-800 border-b pb-2">
                  Daftar Penerima ({recipients.length})
                </h2>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
                  {recipients.map((r: any) => (
                    <div key={r.id} className="flex justify-between p-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{r.nama_penerima}</span>
                        <span className="text-slate-400 block">{r.lokasi_penyaluran || '—'}</span>
                      </div>
                      <span className="font-medium text-slate-700">{formatIDR(Number(r.jumlah_diterima))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Reviewer Box */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 border-b pb-2">Keputusan Reviewer</h2>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status Saat Ini:</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 uppercase">
                  {lpj.status}
                </span>
              </div>

              {lpj.reviewer && (
                <div className="text-xs text-slate-500 border-t pt-2">
                  <p>Reviewer: <span className="font-semibold text-slate-800">{lpj.reviewer}</span></p>
                  {lpj.catatan_review && (
                    <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      &quot;{lpj.catatan_review}&quot;
                    </p>
                  )}
                </div>
              )}

              {lpj.status !== 'approved' && (
                <form onSubmit={handleReview} className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Tindakan</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAction('approve')}
                        className={`rounded-xl py-2 text-xs font-semibold border ${
                          action === 'approve'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Approve LPJ
                      </button>
                      <button
                        type="button"
                        onClick={() => setAction('revisi')}
                        className={`rounded-xl py-2 text-xs font-semibold border ${
                          action === 'revisi'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Minta Revisi
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Reviewer</label>
                    <textarea
                      rows={3}
                      placeholder="Masukkan catatan verifikasi atau arahan revisi..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-teal-600 py-3 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Keputusan'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

