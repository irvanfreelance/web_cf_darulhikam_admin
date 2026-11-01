"use client";

import Link from 'next/link';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import BeneficiaryForm from '@/components/admin/beneficiary-form';
import { jsonFetcher } from '@/lib/json-client';
import type { Beneficiary } from '@/types/penyaluran';

export default function EditBeneficiaryPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR<Beneficiary>(params?.id ? `/api/penyaluran/beneficiaries/${params.id}` : null, jsonFetcher);

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  if (error || !data || (data as { error?: string }).error) {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error?.message || 'Penerima manfaat tidak ditemukan'}</div>;
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <Link href="/penyaluran/penerima-manfaat" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Kembali ke daftar
      </Link>
      <PageHeader title={data.nama_lengkap} description={data.kode_beneficiary} />
      <BeneficiaryForm key={data.id} initial={data} />
    </div>
  );
}
