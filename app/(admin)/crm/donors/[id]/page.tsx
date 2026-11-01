"use client";

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import CrmDonorForm from '@/components/admin/crm-donor-form';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import type { CrmDonor, CrmDonorInvoice } from '@/types/crm';

type Detail = CrmDonor & {
  stats?: { total_invoices: number; total_donated: string | number; paid_invoices: number };
  invoices?: CrmDonorInvoice[];
};

export default function CrmDonorDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<Detail>(params?.id ? `/api/crm/donors/${params.id}` : null, jsonFetcher);

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (error || !data) {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error?.message || 'Donatur tidak ditemukan'}</div>;
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <Link href="/crm/donors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Kembali ke data donatur
      </Link>
      <PageHeader title={data.name} description={`Total donasi tervalidasi ${formatIDR(Number(data.stats?.total_donated || 0))} · ${data.stats?.paid_invoices || 0} invoice lunas`} />
      {data.merged_into_id && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Donatur ini ditandai tergabung ke ID {data.merged_into_id}. Penggabungan invoice tidak dilakukan di layar ini.
        </div>
      )}
      <CrmDonorForm key={data.id} donor={data} onSaved={() => mutate()} />

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-800">Riwayat invoice</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Kampanye</th>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 text-right font-medium">Nominal</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices?.length ? data.invoices.map((invoice) => (
                <tr key={`${invoice.id}-${invoice.created_at}`} className="border-t border-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/transactions/${invoice.invoice_code}`} className="font-medium text-teal-700">{invoice.invoice_code}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{invoice.campaign_title || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(invoice.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">{formatIDR(Number(invoice.total_amount || 0))}</td>
                  <td className="px-4 py-3">{invoice.status}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada invoice.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
