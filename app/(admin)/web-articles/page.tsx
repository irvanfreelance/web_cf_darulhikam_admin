"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { FileText, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ArticlesPage() {
  const [search, setSearch] = useState('');
  const { data: articles, error, mutate } = useSWR(`/api/web-articles?search=${search}`, fetcher);

  const handleDelete = async (id: number) => {
    if (!confirm('Arsip/Hapus artikel ini?')) return;
    try {
      const res = await fetch(`/api/web-articles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        alert('Gagal menghapus artikel');
      }
    } catch (e) {
      alert('Terjadi kesalahan saat menghapus artikel');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Artikel & Berita" 
        description="Kelola publikasi, cerita penerima manfaat, dan update program"
      >
        <Link href="/web-articles/new">
          <Button className="shrink-0">
            <Plus size={18} strokeWidth={3} className="mr-2" /> Tulis Artikel
          </Button>
        </Link>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari judul artikel..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {!articles ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>)}
          </div>
        ) : articles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl w-[400px]">Artikel</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Penulis</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((article: any) => (
                  <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {article.featured_image_url ? (
                          <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                            <Image src={article.featured_image_url} alt="" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-slate-300" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{article.title}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{article.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {article.category_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase
                        ${article.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 
                          article.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {article.author_name}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/web-articles/${article.id}`}>
                        <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                      </Link>
                      <button onClick={() => handleDelete(article.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada artikel ditemukan.</div>
        )}
      </div>
    </div>
  );
}
