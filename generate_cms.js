const fs = require('fs');
const path = require('path');

const modules = [
  { path: 'web-articles', table: 'web_articles', title: 'Artikel', icon: 'FileText' },
  { path: 'web-testimonials', table: 'web_testimonials', title: 'Testimoni', icon: 'MessageSquare' },
  { path: 'web-partners', table: 'web_partners', title: 'Mitra', icon: 'Users2' },
  { path: 'web-reports', table: 'web_financial_reports', title: 'Laporan Keuangan', icon: 'FileCheck' },
  { path: 'web-metrics', table: 'web_impact_metrics', title: 'Impact Metrics', icon: 'BarChart2' },
  { path: 'web-team', table: 'web_team_members', title: 'Tim & Pengurus', icon: 'Users' },
  { path: 'web-legality', table: 'web_legality', title: 'Legalitas', icon: 'Shield' },
  { path: 'web-banks', table: 'web_bank_accounts', title: 'Rekening Resmi', icon: 'Building' },
  { path: 'web-faqs', table: 'web_faqs', title: 'FAQ', icon: 'HelpCircle' }
];

const basePath = path.join(__dirname, 'app', '(admin)');
const apiBasePath = path.join(__dirname, 'app', 'api');

modules.forEach(mod => {
  // Create API Route
  const apiDir = path.join(apiBasePath, mod.path);
  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });
  
  const apiContent = `import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const data = await query(\`SELECT * FROM ${mod.table} ORDER BY id DESC LIMIT 50\`);
    return NextResponse.json(data.rows);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(apiDir, 'route.ts'), apiContent);

  // Create Page Route
  const pageDir = path.join(basePath, mod.path);
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

  const pageContent = `"use client";
import React from 'react';
import useSWR from 'swr';
import { ${mod.icon}, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Page() {
  const { data, error, isLoading } = useSWR('/api/${mod.path}', fetcher);

  if (error) return <div className="p-8 text-rose-500 bg-rose-50 rounded-xl">Error loading data.</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manajemen ${mod.title}" 
        description="Kelola data ${mod.title} untuk website utama"
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
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada data ${mod.title}.</div>
        )}
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageContent);
});

console.log("Scaffolded 9 CMS modules successfully!");
