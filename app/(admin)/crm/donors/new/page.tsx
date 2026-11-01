"use client";

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import CrmDonorForm from '@/components/admin/crm-donor-form';

export default function NewCrmDonorPage() {
  return (
    <div className="space-y-6 text-left">
      <Link href="/crm/donors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Kembali ke data donatur
      </Link>
      <PageHeader title="Donatur baru" description="Menambah baris donors. Data yang sudah ada tidak diubah." />
      <CrmDonorForm />
    </div>
  );
}
