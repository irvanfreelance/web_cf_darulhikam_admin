'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Settings2, Save } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { TablePagination } from '@/components/shared/table-pagination';
import { jsonFetcher } from '@/lib/json-client';

interface SettingRow {
  key: string;
  value: string;
  module: string;
  description: string;
}

export default function AppSettingsPage() {
  const { data, isLoading, mutate } = useSWR<{ rows: SettingRow[] }>('/api/admin/settings', jsonFetcher);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const allRows = data?.rows || [];
  const rows = search.trim()
    ? allRows.filter((r) =>
        `${r.module} ${r.key} ${r.description} ${r.value}`.toLowerCase().includes(search.trim().toLowerCase())
      )
    : allRows;
  const pageSize = 10;
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleSave = async (key: string) => {
    const value = drafts[key] ?? rows.find((r) => r.key === key)?.value ?? '';
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan konfigurasi');
      toast.success(`Konfigurasi ${key} disimpan`);
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSavingKey(null);
    }
  };

  const exportData = rows.map((r, i) => ({
    No: i + 1,
    Modul: r.module,
    Key: r.key,
    Nilai: r.value,
    Keterangan: r.description,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Dinamis Aplikasi"
        description="Kelola kode COA default, persentase dana pengelola, dan parameter sistem secara dinamis tanpa mengubah kode."
      >
        <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
          <Settings2 className="h-4 w-4" />
          Dynamic Settings
        </div>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12">No</th>
                <th className="px-4 py-3">Modul</th>
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Nilai</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Memuat konfigurasi...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada konfigurasi.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, idx) => (
                  <tr key={r.key} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-700">
                        {r.module}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-slate-800">{r.key}</div>
                      <div className="text-xs text-slate-500">{r.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={drafts[r.key] ?? r.value}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))}
                        className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={savingKey === r.key}
                        onClick={() => handleSave(r.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Simpan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          total={rows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          exportData={exportData}
          exportFilename="Konfigurasi_Dinamis.xlsx"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari modul, key, atau keterangan..."
        />
      </div>
    </div>
  );
}

