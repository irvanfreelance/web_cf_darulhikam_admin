"use client";
import React from 'react';
import useSWR from 'swr';
import { BarChart2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Page() {
  const { data, error, isLoading } = useSWR('/api/web-metrics', fetcher);

  if (error) return <div className="p-8 text-rose-500 bg-rose-50 rounded-xl">Error loading data.</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manajemen Impact Metrics" 
        description="Kelola data Impact Metrics untuk website utama"
      >
        <Button className="shrink-0">
          <Plus size={18} strokeWidth={3} /> Tambah Data
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        ) : data?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">ID</th>
                  <th className="px-6 py-4">Data Preview</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">#{item.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                      {item.title || item.name || item.person_name || item.question || item.metric_key || item.bank_name || 'Data Row'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">Aktif</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-indigo-600 font-semibold cursor-pointer">Edit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada data Impact Metrics.</div>
        )}
      </div>
    </div>
  );
}
