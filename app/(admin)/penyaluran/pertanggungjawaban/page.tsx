"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { formatWibDate } from '@/lib/wib-date';
import { ClipboardCheck, FileText, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function LpjListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, error, isLoading } = useSWR(`/api/penyaluran/lpj?status=${statusFilter}`, jsonFetcher);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case 'submitted':
        return (
          <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
            <Clock className="h-3 w-3" /> Review
          </span>
        );
      case 'revisi':
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-3 w-3" /> Perlu Revisi
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Pertanggungjawaban Penyaluran (LPJ)"
        description="Daftar laporan realisasi penyaluran kegiatan ke mustahik beserta bukti lapangan dan hasil verifikasi reviewer."
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Status */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {['all', 'draft', 'submitted', 'approved', 'revisi'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              statusFilter === st
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'all' ? 'Semua Status' : st.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {!isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">No. Pengajuan</th>
                <th className="px-5 py-3.5">Judul Kegiatan & Program</th>
                <th className="px-5 py-3.5 text-right">Realisasi (Rp)</th>
                <th className="px-5 py-3.5 text-center">Bukti</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.rows || data.rows.length === 0) ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada LPJ penyaluran yang tercatat pada filter ini.
                  </td>
                </tr>
              ) : (
                data.rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-teal-800">
                      {row.nomor_pengajuan}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{row.judul || 'Realisasi Penyaluran'}</p>
                      <p className="text-xs text-slate-400">
                        {row.campaign_title || 'Program Umum'} • {formatWibDate(row.tgl_kegiatan)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatIDR(row.jumlah_realisasi)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {row.total_bukti} berkas
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {statusBadge(row.status)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/penyaluran/pertanggungjawaban/${row.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Detail & Review
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
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

