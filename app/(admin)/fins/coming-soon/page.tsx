"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Construction } from 'lucide-react';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Halaman ini';

  return (
    <div className="p-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
          <Construction size={28} className="text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          Halaman ini sedang dalam pengembangan dan akan segera tersedia.
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
