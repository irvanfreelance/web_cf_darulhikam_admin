"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';
import { Save, ArrowLeft, Loader2, Sparkles, Globe } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleGenerateSeo = () => {
    if (!formData.title || !formData.title.trim()) {
      toast.error('Silakan isi Judul Artikel terlebih dahulu untuk generate SEO!');
      return;
    }

    // 1. Meta Title (Maksimal 255 karakter)
    const rawTitle = formData.title.trim();
    const cleanTitle = rawTitle.length > 255 ? rawTitle.substring(0, 252) + '...' : rawTitle;

    // 2. Meta Description (Ambil dari excerpt atau plain text body, maksimal 500 karakter)
    let descText = formData.excerpt?.trim() || '';
    if (!descText && formData.body) {
      descText = formData.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    let cleanDesc = descText;
    if (cleanDesc.length > 500) {
      const cutPoint = cleanDesc.lastIndexOf(' ', 497);
      cleanDesc = (cutPoint > 400 ? cleanDesc.substring(0, cutPoint) : cleanDesc.substring(0, 497)) + '...';
    }

    // 3. Canonical URL
    const slug = initialData?.slug || formData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 180);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lazdarulhikam.com';
    const generatedCanonical = `${siteUrl.replace(/\/$/, '')}/kabar-kebaikan/${slug}`;

    setFormData(prev => ({
      ...prev,
      seo_title: cleanTitle,
      seo_description: cleanDesc,
      canonical_url: generatedCanonical,
      excerpt: prev.excerpt || cleanDesc,
    }));

    toast.success('Data SEO (Meta Title, Description, & Canonical URL) berhasil di-generate!');
  };

  const handleClearSeo = () => {
    setFormData(prev => ({
      ...prev,
      seo_title: '',
      seo_description: '',
      canonical_url: '',
    }));
    toast.info('Data SEO telah dikosongkan.');
  };

  const previewSlug = initialData?.slug || (formData.title ? formData.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'slug-artikel');
  const previewUrl = formData.canonical_url || `https://lazdarulhikam.com/kabar-kebaikan/${previewSlug}`;
  const previewTitle = (formData.seo_title || formData.title || 'Judul Artikel') + ' | LAZ Darul Hikam';
  const previewDesc = formData.seo_description || formData.excerpt || 'Ringkasan cuplikan artikel akan tampil di sini saat dicari melalui Google...';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!formData.category_id) {
      toast.error('Silakan pilih kategori artikel');
      setIsSubmitting(false);
      return;
    }
    
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
        toast.success(initialData ? 'Artikel berhasil diperbarui' : 'Artikel berhasil diterbitkan');
        router.push('/web-articles');
      } else {
        const err = await res.json();
        toast.error(typeof err.error === 'string' ? err.error : 'Gagal menyimpan artikel');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem saat menyimpan');
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
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500">Judul Artikel *</label>
                <span className={`text-[11px] font-mono ${
                  formData.title.length > 255 
                    ? 'text-rose-500 font-bold' 
                    : formData.title.length > 200 
                    ? 'text-amber-500 font-medium' 
                    : 'text-slate-400'
                }`}>
                  {formData.title.length} / 255 karakter
                </span>
              </div>
              <Input 
                required 
                maxLength={255}
                className="text-slate-900 font-medium"
                placeholder="Contoh: Penyaluran Bantuan Korban Bencana" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Judul utama artikel. Maksimal 255 karakter.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500">Judul Panjang (Opsional)</label>
                <span className={`text-[11px] font-mono ${
                  (formData.title_long || '').length > 255 
                    ? 'text-rose-500 font-bold' 
                    : (formData.title_long || '').length > 200 
                    ? 'text-amber-500 font-medium' 
                    : 'text-slate-400'
                }`}>
                  {(formData.title_long || '').length} / 255 karakter
                </span>
              </div>
              <Input 
                maxLength={255}
                className="text-slate-900"
                placeholder="Judul lengkap untuk ditampilkan di halaman artikel" 
                value={formData.title_long}
                onChange={e => setFormData({...formData, title_long: e.target.value})}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Judul headline lengkap untuk halaman detail artikel. Maksimal 255 karakter.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500">Ringkasan (Excerpt) *</label>
                <span className={`text-[11px] font-mono ${
                  formData.excerpt.length > 500 
                    ? 'text-rose-500 font-bold' 
                    : formData.excerpt.length > 400 
                    ? 'text-amber-500 font-medium' 
                    : 'text-slate-400'
                }`}>
                  {formData.excerpt.length} / 500 karakter
                </span>
              </div>
              <textarea 
                required
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Singkat, padat, dan informatif (maksimal 500 karakter)"
                value={formData.excerpt}
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cuplikan ringkas artikel untuk kartu berita dan deskripsi. Maksimal 500 karakter.
              </p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Globe size={16} className="text-emerald-600" />
                  SEO & Discoverability
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Optimasi tampilan artikel di mesin pencari Google & media sosial</p>
              </div>
              <div className="flex items-center gap-2">
                {(formData.seo_title || formData.seo_description || formData.canonical_url) && (
                  <button
                    type="button"
                    onClick={handleClearSeo}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSeo}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-none"
                >
                  <Sparkles size={14} className="text-emerald-600" />
                  Generate SEO Otomatis
                </Button>
              </div>
            </div>

            {/* Meta Title */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500">Meta Title</label>
                <span className={`text-[11px] font-mono ${
                  formData.seo_title.length > 255 
                    ? 'text-rose-500 font-bold' 
                    : formData.seo_title.length > 60 
                    ? 'text-amber-500 font-medium' 
                    : 'text-slate-400'
                }`}>
                  {formData.seo_title.length} / 255 karakter {formData.seo_title.length > 60 ? '(optimal ≤ 60)' : ''}
                </span>
              </div>
              <Input 
                maxLength={255}
                className="text-slate-900"
                placeholder="Biarkan kosong untuk menggunakan Judul Artikel" 
                value={formData.seo_title}
                onChange={e => setFormData({...formData, seo_title: e.target.value})}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Judul cuplikan di hasil pencarian. Disarankan maksimal 60 karakter agar tidak terpotong di Google SERP.
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500">Meta Description</label>
                <span className={`text-[11px] font-mono ${
                  formData.seo_description.length > 500 
                    ? 'text-rose-500 font-bold' 
                    : formData.seo_description.length > 155 
                    ? 'text-amber-500 font-medium' 
                    : 'text-slate-400'
                }`}>
                  {formData.seo_description.length} / 500 karakter {formData.seo_description.length > 155 ? '(optimal ≤ 155)' : ''}
                </span>
              </div>
              <textarea 
                maxLength={500}
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Biarkan kosong untuk menggunakan Ringkasan"
                value={formData.seo_description}
                onChange={e => setFormData({...formData, seo_description: e.target.value})}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Deskripsi ringkasan untuk mesin pencari. Disarankan antara 120 - 155 karakter agar pas di cuplikan Google.
              </p>
            </div>

            {/* Canonical URL & Robots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Canonical URL</label>
                <Input 
                  className="text-slate-900 font-mono text-xs"
                  placeholder="https://lazdarulhikam.com/kabar-kebaikan/..." 
                  value={formData.canonical_url}
                  onChange={e => setFormData({...formData, canonical_url: e.target.value})}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  URL utama halaman artikel untuk menghindari duplikasi konten.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Robots Directive</label>
                <select 
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900"
                  value={formData.robots_directive}
                  onChange={e => setFormData({...formData, robots_directive: e.target.value})}
                >
                  <option value="index,follow">Index, Follow (Direkomendasikan)</option>
                  <option value="noindex,follow">No Index, Follow</option>
                  <option value="index,nofollow">Index, No Follow</option>
                  <option value="noindex,nofollow">No Index, No Follow</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Perintah perayapan untuk bot mesin pencari (Googlebot).
                </p>
              </div>
            </div>

            {/* Google SERP Preview */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500">Pratinjau Hasil Pencarian Google (SERP Preview)</label>
                <span className="text-[10px] text-slate-400 font-medium">Live Preview</span>
              </div>
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-left space-y-1 font-sans shadow-sm">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    DH
                  </div>
                  <div className="truncate">
                    <p className="text-[12px] font-medium text-slate-800 leading-none">LAZ Darul Hikam</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5 max-w-[500px]">
                      {previewUrl}
                    </p>
                  </div>
                </div>
                <h4 className="text-[17px] text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug line-clamp-1 pt-1">
                  {previewTitle}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-0.5">
                  {previewDesc}
                </p>
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
