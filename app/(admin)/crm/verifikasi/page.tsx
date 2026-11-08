"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDate } from '@/lib/wib-date';
import { Users, AlertTriangle, ArrowRight, CheckCircle2, History, ShieldCheck } from 'lucide-react';

type DonorItem = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  nik: string | null;
  total_donasi: number;
  jumlah_transaksi: number;
  created_at: string;
};

type DuplicateGroup = {
  key: string;
  count: number;
  donors: DonorItem[];
};

type MergeLog = {
  id: number;
  survivor_id: number;
  merged_id: number;
  survivor_nama: string;
  merged_nama: string;
  actor: string;
  merged_at: string;
};

export default function VerifikasiDonaturPage() {
  const { data, error, isLoading, mutate } = useSWR<{
    by_phone: DuplicateGroup[];
    by_email: DuplicateGroup[];
    by_nik: DuplicateGroup[];
    history: MergeLog[];
  }>('/api/crm/donors/duplicates', jsonFetcher);

  const [activeTab, setActiveTab] = useState<'phone' | 'email' | 'nik' | 'history'>('phone');
  const [selectedSurvivor, setSelectedSurvivor] = useState<Record<string, number>>({});
  const [merging, setMerging] = useState(false);

  const currentGroups = activeTab === 'phone'
    ? data?.by_phone
    : activeTab === 'email'
    ? data?.by_email
    : activeTab === 'nik'
    ? data?.by_nik
    : [];

  const handleMerge = async (groupKey: string, survivorId: number, mergedId: number) => {
    if (!window.confirm(`Konfirmasi penggabungan donatur ID #${mergedId} ke ID #${survivorId}? Seluruh invoice transaksi akan dipindahkan ke donatur utama.`)) {
      return;
    }

    setMerging(true);
    try {
      const res = await sendJson('/api/crm/donors/merge', 'POST', {
        survivor_id: survivorId,
        merged_id: mergedId,
      });
      toast.success(`Berhasil menggabungkan. ${res.invoices_moved || 0} invoice dipindahkan.`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menggabungkan donatur');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Verifikasi & Deduplikasi Donatur"
        description="Identifikasi donatur dengan nomor telepon, email, atau NIK identik, lalu satukan riwayat donasi secara aman tanpa menghapus data audit."
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('phone')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'phone'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          No. Telepon ({data?.by_phone?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'email'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          Email ({data?.by_email?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('nik')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'nik'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          NIK ({data?.by_nik?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'history'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="h-4 w-4" />
          Riwayat Penggabungan ({data?.history?.length || 0})
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {/* Tab Konten Duplikasi */}
      {activeTab !== 'history' && !isLoading && (
        <div className="space-y-6">
          {(!currentGroups || currentGroups.length === 0) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-medium text-slate-700">Tidak ada indikasi duplikasi donatur.</p>
              <p className="text-xs text-slate-400 mt-1">Seluruh data donatur unik berdasarkan kriteria ini.</p>
            </div>
          ) : (
            currentGroups.map((group) => {
              const survivorId = selectedSurvivor[group.key] || group.donors[0]?.id;
              return (
                <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="font-bold text-slate-800 text-base">{group.key}</span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        {group.count} Akun Terdeteksi
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">Pilih salah satu sebagai donatur utama (survivor)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.donors.map((donor) => {
                      const isSurvivor = survivorId === donor.id;
                      return (
                        <div
                          key={donor.id}
                          onClick={() => setSelectedSurvivor((prev) => ({ ...prev, [group.key]: donor.id }))}
                          className={`cursor-pointer rounded-xl border p-4 transition ${
                            isSurvivor
                              ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              #{donor.id} {donor.name}
                            </span>
                            {isSurvivor ? (
                              <span className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                Donatur Utama
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Klik untuk jadikan utama</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <p>Telp: {donor.phone || '—'}</p>
                            <p>Email: {donor.email || '—'}</p>
                            <p>Terdaftar: {formatWibDate(donor.created_at)}</p>
                            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-medium">
                              <span>Total: {formatIDR(donor.total_donasi)}</span>
                              <span>{donor.jumlah_transaksi} Transaksi</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tombol Aksi Penggabungan */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {group.donors
                      .filter((d) => d.id !== survivorId)
                      .map((dup) => (
                        <button
                          key={dup.id}
                          disabled={merging}
                          onClick={() => handleMerge(group.key, survivorId, dup.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                        >
                          Gabung #{dup.id} ({dup.name}) ke Utama
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Riwayat Merge */}
      {activeTab === 'history' && !isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Donatur Utama (Survivor)</th>
                <th className="px-5 py-3.5">Donatur yang Digabung</th>
                <th className="px-5 py-3.5">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.history || data.history.length === 0) ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Belum ada riwayat penggabungan donatur.
                  </td>
                </tr>
              ) : (
                data.history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatWibDate(item.merged_at)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      #{item.survivor_id} {item.survivor_nama || 'Donatur'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      #{item.merged_id} {item.merged_nama || 'Donatur'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {item.actor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

