'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { TablePagination } from '@/components/shared/table-pagination';
import { jsonFetcher } from '@/lib/json-client';

interface RbacUser {
  id: number;
  name: string;
  email: string;
  global_role: string;
  module_roles: Record<string, string>;
}

const MODULE_OPTIONS: Record<string, { label: string; value: string }[]> = {
  fins: [
    { value: 'none', label: 'Tidak Ada Akses' },
    { value: 'staff', label: 'Staff (Entry)' },
    { value: 'akunting', label: 'Akunting (Approve)' },
    { value: 'admin', label: 'Admin FINS' },
  ],
  crm: [
    { value: 'none', label: 'Tidak Ada Akses' },
    { value: 'zisco', label: 'Zisco (Data Sendiri)' },
    { value: 'supervisor', label: 'Supervisor (Semua Data)' },
    { value: 'admin', label: 'Admin CRM' },
  ],
  penyaluran: [
    { value: 'none', label: 'Tidak Ada Akses' },
    { value: 'staff', label: 'Staff (Data Sendiri)' },
    { value: 'supervisor', label: 'Supervisor (Semua Data)' },
    { value: 'admin', label: 'Admin Penyaluran' },
  ],
};

export default function RbacSettingsPage() {
  const { data, isLoading, mutate } = useSWR<{ rows: RbacUser[] }>('/api/admin/rbac', jsonFetcher);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const allRows = data?.rows || [];
  const rows = search.trim()
    ? allRows.filter((u) =>
        `${u.name} ${u.email} ${u.global_role}`.toLowerCase().includes(search.trim().toLowerCase())
      )
    : allRows;
  const pageSize = 10;
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleRoleChange = async (userId: number, module: 'fins' | 'crm' | 'penyaluran', role: string) => {
    const key = `${userId}-${module}`;
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, module, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan role');
      }
      toast.success('Akses modul diperbarui');
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan role');
    } finally {
      setSavingKey(null);
    }
  };

  const exportData = rows.map((u, idx) => ({
    No: idx + 1,
    Nama: u.name,
    Email: u.email,
    'Role Global': u.global_role,
    FINS: u.module_roles?.fins || 'none',
    CRM: u.module_roles?.crm || 'none',
    Penyaluran: u.module_roles?.penyaluran || 'none',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan RBAC Multi-Modul"
        description="Atur akses dinamis per user untuk modul FINS, CRM, dan Penyaluran (termasuk isolasi data staff/Zisco vs atasan/admin)."
      >
        <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
          <ShieldCheck className="h-4 w-4" />
          Dynamic Multi-Module RBAC
        </div>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12">No</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Global</th>
                <th className="px-4 py-3">Modul FINS</th>
                <th className="px-4 py-3">Modul CRM</th>
                <th className="px-4 py-3">Modul Penyaluran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Memuat daftar user...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data user.
                  </td>
                </tr>
              ) : (
                pagedRows.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {u.global_role}
                      </span>
                    </td>
                    {(['fins', 'crm', 'penyaluran'] as const).map((mod) => (
                      <td key={mod} className="px-4 py-3">
                        <select
                          disabled={savingKey === `${u.id}-${mod}`}
                          value={u.module_roles?.[mod] || 'none'}
                          onChange={(e) => handleRoleChange(u.id, mod, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                        >
                          {MODULE_OPTIONS[mod].map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
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
          exportFilename="RBAC_Multi_Modul.xlsx"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama, email, atau role..."
        />
      </div>
    </div>
  );
}

