"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Save, Loader2, X, Image as ImageIcon,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FileUpload } from '@/components/ui/file-upload';
import { NumberInput } from '@/components/ui/number-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: categories } = useSWR('/api/categories', fetcher);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', category_id: 0, slug: '', image_url: '', description: '',
    target_amount: 0, end_date: '', is_zakat: false, is_qurban: false, 
    has_no_target: false, is_urgent: false, is_verified: true, is_carousel: false, status: 'ACTIVE'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        toast('Mengupload gambar ke server...');
        const fileForm = new FormData();
        fileForm.append('file', imageFile);
        
        const response = await fetch(`/api/upload?filename=${imageFile.name}`, {
          method: 'POST',
          body: imageFile,
        });
        if (!response.ok) throw new Error('Gagal mengupload gambar');
        const blobRes = await response.json();
        finalImageUrl = blobRes.url;
      }

      const postData = { ...formData, image_url: finalImageUrl };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      toast.success('Kampanye berhasil dibuat');
      router.push('/campaigns');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          onClick={() => router.back()}
          variant="outline"
          size="icon"
          className="rounded-2xl"
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="text-left flex-1 mt-6">
          <PageHeader 
            title="Buat Kampanye Baru" 
            description="Lengkapi detail program untuk mulai menggalang dana"
            className="mb-0"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-500 mb-2 font-sans">Judul Kampanye</label>
              <Input 
                required 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                placeholder="Contoh: Bantu Pembangunan Masjid Al-Ikhlas"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Slug URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-semibold">/</span>
                  <Input 
                    required 
                    value={formData.slug} 
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} 
                    placeholder="nama-program"
                    className="pl-8 font-mono" 
                  />
                </div>
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Kategori</label>
                <SearchableSelect 
                  value={formData.category_id} 
                  onChange={(val) => setFormData({...formData, category_id: Number(val)})} 
                  options={categories?.map((cat: any) => ({ id: cat.id, name: cat.name })) || []}
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Deskripsi Lengkap</label>
              <RichTextEditor
                value={formData.description || ''} 
                onChange={(val) => setFormData({...formData, description: val})} 
                placeholder="Ceritakan tentang program ini secara detail..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl text-sm font-normal text-slate-900 overflow-hidden" 
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Pengaturan Target & Waktu</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Target Dana (IDR)</label>
                <NumberInput 
                  disabled={formData.has_no_target}
                  value={formData.target_amount} 
                  onChange={(val) => setFormData({...formData, target_amount: val})}
                  prefix="Rp"
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Tanggal Berakhir</label>
                <Input 
                  type="date" 
                  value={formData.end_date} 
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
                />
              </div>
            </div>
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-left">
              <input 
                type="checkbox" 
                checked={formData.has_no_target} 
                onChange={(e) => setFormData({...formData, has_no_target: e.target.checked})} 
                className="w-5 h-5 text-teal-600 rounded-lg border-slate-200 focus:ring-teal-500" 
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700">Terima Tanpa Batas Target</span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Donasi akan terus dibuka meskipun target sudah tercapai</span>
              </div>
            </label>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Foto Utama</h3>
            <FileUpload 
              value={formData.image_url}
              onChange={(url) => setFormData({...formData, image_url: url})}
              deferred
              onFileSelect={(file) => setImageFile(file)}
            />
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
             <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Atribut Kampanye</h3>
             {[
               { id: 'is_urgent', label: 'Darurat / Mendesak', icon: AlertCircle, color: 'text-rose-500' },
               { id: 'is_carousel', label: 'Tampilkan di Carousel', icon: ImageIcon, color: 'text-indigo-500' },
               { id: 'is_zakat', label: 'Program Zakat', icon: CheckCircle2, color: 'text-emerald-500' },
               { id: 'is_qurban', label: 'Program Qurban', icon: CheckCircle2, color: 'text-amber-500' },
               { id: 'is_verified', label: 'Campaign Diverifikasi', icon: CheckCircle2, color: 'text-blue-500' },
             ].map((item) => (
                <label key={item.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className={item.color} />
                    <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={(formData as any)[item.id]} 
                    onChange={(e) => setFormData({...formData, [item.id]: e.target.checked})} 
                    className="w-5 h-5 text-teal-600 rounded-lg border-slate-200 focus:ring-teal-500" 
                  />
                </label>
             ))}
          </div>

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Kampanye
          </Button>
        </div>
      </form>
    </div>
  );
}
