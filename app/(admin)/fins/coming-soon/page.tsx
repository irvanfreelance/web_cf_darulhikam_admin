"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Construction } from 'lucide-react';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Halaman ini';

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h1 className="text-2xl font-normal text-slate-800 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-400 font-medium mt-1">Segera hadir</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
          <Construction size={28} className="text-teal-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-800">Halaman ini sedang dalam pengembangan</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Fitur {title} akan segera tersedia di panel admin ini.
        </p>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoonContent />
    </Suspense>
  );
}
