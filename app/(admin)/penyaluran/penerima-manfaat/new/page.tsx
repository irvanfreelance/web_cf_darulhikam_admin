"use client";

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import BeneficiaryForm from '@/components/admin/beneficiary-form';

export default function NewBeneficiaryPage() {
  return (
    <div className="space-y-6 text-left">
      <Link href="/penyaluran/penerima-manfaat" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Kembali ke daftar
      </Link>
      <PageHeader title="Penerima manfaat baru" description="Identitas, wilayah, koordinat, dan catatan kelayakan" />
      <BeneficiaryForm />
    </div>
  );
}
