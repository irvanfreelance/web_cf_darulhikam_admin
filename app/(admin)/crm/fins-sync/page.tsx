"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';

type Preview = { ready: number; unmapped: number; closed: number; total: number; samples: { invoice_code: string; reason: string }[] };

export default function FinsSyncPage() {
  const { data, error, mutate, isLoading } = useSWR<Preview>('/api/crm/fins-sync', jsonFetcher);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ posted: number; skipped: number; errors: { invoice_code: string; reason: string }[] } | null>(null);

  const sync = async () => {
    setBusy(true);
    try {
      const response = await sendJson('/api/crm/fins-sync', 'POST', {});
      setResult(response);
      toast.success(`${response.posted} invoice dijurnal`);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyinkronkan invoice');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="FINS Sync" description="Menyalin invoice PAID yang belum tersinkron ke jurnal penerimaan. Idempoten lewat fins_synced_at. Kampanye atau bank tanpa COA dilewati.">
        <button type="button" disabled={busy || !data?.ready} onClick={sync} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
          {busy ? 'Menyinkronkan...' : `Sync ${data?.ready ?? 0} invoice`}
        </button>
      </PageHeader>
      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />}
      {data && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs text-emerald-700">Siap dijurnal</div><div className="text-2xl">{data.ready}</div></div>
          <div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs text-amber-700">Tanpa pemetaan COA</div><div className="text-2xl">{data.unmapped}</div></div>
          <div className="rounded-2xl bg-slate-100 p-4"><div className="text-xs text-slate-500">Periode tertutup</div><div className="text-2xl">{data.closed}</div></div>
        </div>
      )}
      {!!data?.samples?.length && (
        <ul className="space-y-1 text-sm text-slate-600">
          {data.samples.map((row) => <li key={row.invoice_code}>{row.invoice_code}: {row.reason}</li>)}
        </ul>
      )}
      {result && <p className="text-sm text-slate-700">Tersimpan {result.posted}, dilewati {result.skipped}. {result.errors.map((row) => row.invoice_code).join(', ')}</p>}
    </div>
  );
}
