'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const impersonatedBy = (session?.user as any)?.impersonatedBy;

  if (!impersonatedBy) return null;

  const handleStop = async () => {
    try {
      await update({ stopImpersonate: true });
      toast.success(`Kembali ke akun ${impersonatedBy.name}`);
      router.push('/pengaturan/rbac');
      router.refresh();
    } catch {
      toast.error('Gagal kembali ke Superadmin');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span>
          Anda sedang login sebagai <strong>{session?.user?.name}</strong> (Impersonate oleh{' '}
          <strong>{impersonatedBy.name}</strong>).
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Kembali ke Superadmin
      </button>
    </div>
  );
}

