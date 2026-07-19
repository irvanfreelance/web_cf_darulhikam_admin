"use client";

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  Plus, Search, Edit, Trash2, X, Save, Loader2, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr));
};

export default function CampaignUpdatesPage() {
  const [search, setSearch] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const { data: campaigns } = useSWR('/api/campaigns', fetcher);
  const { data: remoteData, error, isLoading } = useSWR(
    `/api/campaign-updates?search=${search}&campaign_id=${campaignId}`, 
    fetcher
  );
  
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (remoteData) {
      setItems(remoteData);
    }
  }, [remoteData]);

  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<{
    campaign_id: string; title: string; excerpt: string; content: string; image_url: string; image_file: File | null;
  }>({
    campaign_id: '', title: '', excerpt: '', content: '', image_url: '', image_file: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (item: any = null) => {
    setSelectedItem(item);
    if (item) {
      setFormData({
        campaign_id: item.campaign_id.toString(),
        title: item.title,
        excerpt: item.excerpt || '',
        content: item.content || '',
        image_url: item.image_url || '',
        image_file: null
      });
    } else {
      setFormData({
        campaign_id: '', title: '', excerpt: '', content: '', image_url: '', image_file: null
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaign_id) return toast.error('Pilih kampanye terlebih dahulu');
    
    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.image_url;
      if (formData.image_file) {
        toast('Mengupload gambar ke server...');
        const fileForm = new FormData();
        fileForm.append('file', formData.image_file);
        
        const response = await fetch(`/api/upload?filename=${formData.image_file.name}`, {
          method: 'POST',
          body: formData.image_file,
        });
        if (!response.ok) throw new Error('Gagal mengupload gambar');
        const blobRes = await response.json();
        finalImageUrl = blobRes.url;
      }

      const method = selectedItem ? 'PATCH' : 'POST';
      const url = selectedItem ? `/api/campaign-updates/${selectedItem.id}` : '/api/campaign-updates';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: parseInt(formData.campaign_id),
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          image_url: finalImageUrl
        }),
      });
      
      if (!res.ok) throw new Error('Gagal menyimpan kabar penyaluran');
      toast.success(selectedItem ? 'Kabar diperbarui' : 'Kabar ditambahkan');
      mutate(`/api/campaign-updates?search=${search}&campaign_id=${campaignId}`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kabar penyaluran ini?')) return;
    try {
      const res = await fetch(`/api/campaign-updates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus kabar');
      toast.success('Kabar dihapus');
      mutate(`/api/campaign-updates?search=${search}&campaign_id=${campaignId}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
         title="Kabar Penyaluran"
         description="Laporan detail aktivitas penyaluran dan update campaign"
      >
         <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 rounded-xl px-6"><Plus size={18} className="mr-2" /> Tambah Kabar</Button>
      </PageHeader>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Cari Kabar</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari berdasarkan judul kabar atau nama kampanye..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 w-full bg-slate-50 border-slate-100"
            />
          </div>
          <div className="w-full md:w-80">
            <SearchableSelect 
               value={campaignId}
               onChange={(val) => setCampaignId(String(val))}
               options={[{ id: '', name: 'Semua Kampanye' }, ...(campaigns?.map((c: any) => ({ id: c.id, name: c.title })) || [])]}
               placeholder="Filter Kampanye"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500" />
            Daftar Kabar Penyaluran ({totalCount})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                 <th className="px-6 py-4 w-16 text-center">No</th>
                 <th className="px-6 py-4">Informasi Kabar</th>
                 <th className="px-6 py-4">Kampanye</th>
                 <th className="px-6 py-4">Tanggal Publikasi</th>
                 <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {isLoading ? (
                 [...Array(3)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="h-20 px-6 py-5 bg-slate-50/20"></td></tr>)
               ) : paginatedItems.length > 0 ? (
                 paginatedItems.map((item, idx) => (
                   <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 text-center font-bold text-slate-800">
                        {offset + idx + 1}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                               {item.image_url ? (
                                 <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
                               )}
                            </div>
                            <div className="flex flex-col">
                               <span className="font-bold text-slate-800 line-clamp-1">{item.title}</span>
                               <span className="text-xs text-slate-500 line-clamp-1">{item.excerpt || 'Tidak ada deskripsi singkat.'}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-bold line-clamp-1 max-w-[200px]">
                           {item.campaign_title}
                         </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-slate-500">
                         {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-5 text-center">
                         <div className="flex justify-center gap-1">
                           <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit Data"><Edit size={16} /></button>
                           <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Hapus"><Trash2 size={16} /></button>
                         </div>
                      </td>
                   </tr>
                 ))
               ) : (
                 <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic font-medium">Tidak ada data kabar.</td></tr>
               )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalCount > 0 && (
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            offset={offset}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={20} /></div>
                {selectedItem ? 'Edit Kabar Penyaluran' : 'Tambah Kabar Penyaluran'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="text-left">
                       <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Kampanye *</label>
                       <SearchableSelect 
                          value={formData.campaign_id}
                          onChange={(val) => setFormData({...formData, campaign_id: val.toString()})}
                          options={campaigns?.map((c: any) => ({ id: c.id, name: c.title })) || []}
                          placeholder="Pilih Kampanye"
                       />
                    </div>
                    <div className="text-left">
                       <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Judul Kabar *</label>
                       <Input 
                          required 
                          value={formData.title} 
                          onChange={(e) => setFormData({...formData, title: e.target.value})} 
                          placeholder="Contoh: Penyaluran Tahap 1..."
                       />
                    </div>
                    <div className="text-left">
                       <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Kutipan Singkat (Excerpt)</label>
                       <textarea 
                          rows={3} 
                          value={formData.excerpt} 
                          onChange={(e) => setFormData({...formData, excerpt: e.target.value})} 
                          placeholder="Ringkasan singkat kabar penyaluran..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-500/50 resize-none"
                       />
                    </div>
                 </div>

                 <div className="space-y-3 text-left">
                    <label className="block text-xs font-bold text-slate-500 font-sans">Foto Dokumentasi</label>
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center">
                      {formData.image_url ? (
                        <div className="w-full rounded-xl overflow-hidden shadow-sm relative group">
                           <img src={formData.image_url} alt="Cover Preview" className="w-full aspect-video object-cover" />
                           <button type="button" onClick={() => setFormData({...formData, image_url: '', image_file: null})} className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                             <X size={16} />
                           </button>
                        </div>
                      ) : (
                        <FileUpload 
                          value={formData.image_url} 
                          onChange={(val) => setFormData({...formData, image_url: val})} 
                          deferred
                          onFileSelect={(file) => setFormData({...formData, image_file: file})}
                        />
                      )}
                    </div>
                 </div>
              </div>

              <div className="text-left">
                 <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Konten Lengkap Kabar</label>
                 <RichTextEditor 
                    value={formData.content} 
                    onChange={(val) => setFormData({...formData, content: val})} 
                    className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden" 
                 />
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold bg-white px-6 py-5">Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-500/20">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Kabar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
