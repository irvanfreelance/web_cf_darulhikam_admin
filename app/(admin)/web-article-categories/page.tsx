"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Tags, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ArticleCategoriesPage() {
  const { data: categories, error, mutate } = useSWR('/api/web-article-categories', fetcher);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '', is_active: true });
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async (id?: number) => {
    const url = '/api/web-article-categories';
    const method = id ? 'PATCH' : 'POST';
    const body = id ? { id, ...editForm } : editForm;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsEditing(null);
        setIsCreating(false);
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      alert('Gagal menyimpan kategori');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      const res = await fetch(`/api/web-article-categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      alert('Gagal menghapus kategori');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Kategori Artikel" 
        description="Manajemen kategori untuk artikel CMS Website"
      >
        <Button onClick={() => {
          setIsCreating(true);
          setEditForm({ name: '', slug: '', description: '', is_active: true });
        }} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Kategori
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left p-6">
        {!categories ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Nama Kategori</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total Artikel</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isCreating && (
                  <tr className="bg-indigo-50/50">
                    <td className="px-6 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nama" /></td>
                    <td className="px-6 py-4"><Input value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} placeholder="Slug" /></td>
                    <td className="px-6 py-4">
                      <select className="p-2 border rounded" value={editForm.is_active ? '1' : '0'} onChange={e => setEditForm({...editForm, is_active: e.target.value === '1'})}>
                        <option value="1">Aktif</option>
                        <option value="0">Tidak Aktif</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">-</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button size="sm" onClick={() => handleSave()}><Check size={14}/></Button>
                      <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}><X size={14}/></Button>
                    </td>
                  </tr>
                )}
                {categories.map((cat: any) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    {isEditing === cat.id ? (
                      <>
                        <td className="px-6 py-4"><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                        <td className="px-6 py-4"><Input value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} /></td>
                        <td className="px-6 py-4">
                          <select className="p-2 border rounded" value={editForm.is_active ? '1' : '0'} onChange={e => setEditForm({...editForm, is_active: e.target.value === '1'})}>
                            <option value="1">Aktif</option>
                            <option value="0">Tidak Aktif</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{cat.article_count}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button size="sm" onClick={() => handleSave(cat.id)}><Check size={14}/></Button>
                          <Button size="sm" variant="outline" onClick={() => setIsEditing(null)}><X size={14}/></Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{cat.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono text-xs">{cat.slug}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${cat.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {cat.is_active ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{cat.article_count}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setIsEditing(cat.id); setEditForm({ name: cat.name, slug: cat.slug, description: cat.description, is_active: cat.is_active }); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
