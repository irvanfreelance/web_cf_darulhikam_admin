"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ArticleForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const { data: categories } = useSWR('/api/web-article-categories', fetcher);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    title_long: initialData?.title_long || '',
    excerpt: initialData?.excerpt || '',
    body: initialData?.body || '',
    category_id: initialData?.category_id || '',
    status: initialData?.status || 'draft',
    featured_image_url: initialData?.featured_image_url || '',
    is_featured: initialData?.is_featured || false,
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    canonical_url: initialData?.canonical_url || '',
    robots_directive: initialData?.robots_directive || 'index,follow',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = '/api/web-articles';
      const method = initialData ? 'PATCH' : 'POST';
      const body = initialData ? { id: initialData.id, ...formData } : formData;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          category_id: parseInt(body.category_id as string)
        })
      });
      
      if (res.ok) {
        router.push('/web-articles');
      } else {
        const err = await res.json();
        alert(JSON.stringify(err.error || err.errors));
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <PageHeader 
        title={initialData ? 'Edit Artikel' : 'Tulis Artikel Baru'} 
        description="Lengkapi form di bawah ini untuk menerbitkan artikel."
      >
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" /> Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            {initialData ? 'Simpan Perubahan' : 'Terbitkan'}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Judul Artikel *</label>
              <Input 
                required 
                className="text-slate-900 font-medium"
                placeholder="Contoh: Penyaluran Bantuan Korban Bencana" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Judul Panjang (Opsional)</label>
              <Input 
                className="text-slate-900"
                placeholder="Judul lengkap untuk ditampilkan di halaman artikel" 
                value={formData.title_long}
                onChange={e => setFormData({...formData, title_long: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Ringkasan (Excerpt) *</label>
              <textarea 
                required
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Singkat, padat, dan menarik (maksimal 160 karakter untuk SEO)"
                value={formData.excerpt}
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Isi Artikel / Konten *</label>
              <div className="min-h-[400px] border border-slate-200 rounded-xl overflow-hidden text-slate-900">
                <RichTextEditor 
                  value={formData.body}
                  onChange={(val) => setFormData({...formData, body: val})}
                  placeholder="Tulis cerita atau laporan di sini..."
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-3">SEO & Discoverability</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Meta Title</label>
              <Input 
                className="text-slate-900"
                placeholder="Biarkan kosong untuk menggunakan Judul Artikel" 
                value={formData.seo_title}
                onChange={e => setFormData({...formData, seo_title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Meta Description</label>
              <textarea 
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Biarkan kosong untuk menggunakan Ringkasan"
                value={formData.seo_description}
                onChange={e => setFormData({...formData, seo_description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Canonical URL</label>
                <Input 
                  className="text-slate-900"
                  placeholder="https://..." 
                  value={formData.canonical_url}
                  onChange={e => setFormData({...formData, canonical_url: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Robots Directive</label>
                <select 
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900"
                  value={formData.robots_directive}
                  onChange={e => setFormData({...formData, robots_directive: e.target.value})}
                >
                  <option value="index,follow">Index, Follow</option>
                  <option value="noindex,follow">No Index, Follow</option>
                  <option value="index,nofollow">Index, No Follow</option>
                  <option value="noindex,nofollow">No Index, No Follow</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Status Publikasi</label>
              <select 
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="draft">Draft (Simpan Sementara)</option>
                <option value="published">Published (Terbitkan)</option>
                <option value="archived">Archived (Arsipkan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Kategori Artikel *</label>
              <select 
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900"
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="" disabled>Pilih Kategori</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  checked={formData.is_featured}
                  onChange={e => setFormData({...formData, is_featured: e.target.checked})}
                />
                <span className="text-sm font-medium text-slate-700">Tampilkan di Beranda (Featured)</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <FileUpload 
              label="Featured Image (Thumbnail)"
              value={formData.featured_image_url}
              onChange={(url) => setFormData({...formData, featured_image_url: url})}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
