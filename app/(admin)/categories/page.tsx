"use client";

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  Plus, Search, Edit, Trash2, X, Save, AlertCircle, Loader2,
  Eye, Layers, ArrowUpRight, CheckCircle2, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Pagination } from '@/components/shared/pagination';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const { data: categories, error, isLoading, mutate } = useSWR(`/api/categories?limit=${limit}&offset=${offset}&search=${search}`, fetcher);

  const totalCount = categories?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', color_theme: 'teal', is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (category: any = null) => {
    setSelectedCategory(category);
    if (category) {
      setFormData({ name: category.name, color_theme: category.color_theme || 'teal', is_active: category.is_active });
    } else {
      setFormData({ name: '', color_theme: 'teal', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (cat: any) => {
    setSelectedCategory(cat);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const method = selectedCategory ? 'PATCH' : 'POST';
      const body = selectedCategory ? { id: selectedCategory.id, ...formData } : formData;
      
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save category');
      }
      
      toast.success(selectedCategory ? 'Kategori diperbarui' : 'Kategori berhasil dibuat');
      mutate();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    toast('Hapus kategori ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to delete');
            }
            toast.success('Kategori berhasil dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Kategori Kampanye</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Kelola pengelompokan program</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-normal flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 shrink-0"
        >
          <Plus size={18} strokeWidth={3} /> Tambah Kategori
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari kategori..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" 
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-normal">
                <th className="px-6 py-4 border-b border-slate-100 font-bold w-12 text-center">#</th>
                <th className="px-6 py-4 border-b border-slate-100 font-bold">Nama Kategori</th>
                <th className="px-6 py-4 border-b border-slate-100 font-bold">Tema Warna</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal text-right">Total Kampanye</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(limit)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 px-6 py-4"></td></tr>)
              ) : categories?.length > 0 ? (
                categories.map((cat: any, idx: number) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 text-center text-xs font-normal text-slate-400">
                      {offset + idx + 1}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded-full border border-white shadow-sm", `bg-${cat.color_theme}-500`)}></div>
                        <span className="text-[10px] font-normal text-slate-400">{cat.color_theme}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-normal text-slate-600 text-right">
                       {cat.campaign_count || 0} Program
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[9px] font-normal border",
                         cat.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                       )}>
                         {cat.is_active ? 'Aktif' : 'Nonaktif'}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-1 transition-opacity">
                        <button onClick={() => handleOpenDetail(cat)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                        <button onClick={() => handleOpenModal(cat)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No categories found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
         <Pagination 
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          offset={offset}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          isLoading={isLoading}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">
                {selectedCategory ? 'Edit Kategori' : 'Kategori Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="text-left">
                <label className="block text-xs font-normal text-slate-500 mb-2">Nama kategori</label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Cth: Pendidikan, Bencana, dll" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500 transition-all font-sans" />
              </div>
              
              <div className="text-left">
                <label className="block text-xs font-normal text-slate-500 mb-3">Pilih tema warna</label>
                <div className="flex flex-wrap gap-3">
                  {['rose', 'blue', 'orange', 'teal', 'emerald', 'amber', 'indigo', 'slate'].map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({ ...formData, color_theme: color })} className={cn("w-10 h-10 rounded-full border-4 transition-all hover:scale-110", `bg-${color}-500`, formData.color_theme === color ? 'border-teal-100 shadow-xl' : 'border-transparent opacity-60')}></button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="relative">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="sr-only" />
                  <div className={cn("w-12 h-6 rounded-full transition-colors", formData.is_active ? 'bg-teal-500' : 'bg-slate-200')}></div>
                  <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform", formData.is_active ? 'translate-x-6' : 'translate-x-0')}></div>
                </div>
                <div className="flex flex-col">
                   <span className="text-xs font-normal text-slate-700">Kategori aktif</span>
                   <span className="text-[10px] font-normal text-slate-400">Aktifkan untuk menampilkan di publik</span>
                </div>
              </label>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-6 rounded-2xl text-sm font-normal text-slate-400 hover:bg-slate-50 transition-all font-sans">Batal</button>
                <button disabled={isSubmitting} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white py-4 px-6 rounded-2xl text-sm font-normal shadow-xl shadow-teal-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 font-sans">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-300 text-left">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Detail Kategori</h2>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-8">
               <div className="flex items-center gap-6">
                 <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl rotate-3 transition-transform hover:rotate-0", `bg-${selectedCategory.color_theme}-500`)}>
                   <Layers size={40} className="text-white" />
                 </div>
                 <div className="text-left">
                   <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-tight">{selectedCategory.name}</h3>
                   <div className="flex items-center gap-2 mt-2">
                       <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        selectedCategory.is_active ? "bg-emerald-50 text-emerald-700 shadow-sm" : "bg-slate-50 text-slate-400"
                      )}>{selectedCategory.is_active ? 'Category Active' : 'Category Inactive'}</span>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                    <p className="text-[10px] font-bold text-slate-400 mb-2">Pemanfaatan</p>
                    <p className="text-2xl font-bold text-slate-800 tracking-tighter">{selectedCategory.campaign_count || 0} <span className="text-xs font-bold text-slate-400 ml-1">Program aktif</span></p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                    <p className="text-[10px] font-normal text-slate-500 mb-2">Tema warna</p>
                    <div className="flex items-center gap-3">
                       <div className={cn("w-6 h-6 rounded-full", `bg-${selectedCategory.color_theme}-500`)}></div>
                       <p className="text-lg font-bold text-slate-800">{selectedCategory.color_theme}</p>
                    </div>
                  </div>
               </div>

               <div className="flex gap-3 pt-2 text-left">
                  <button onClick={() => { setIsDetailOpen(false); handleOpenModal(selectedCategory); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all font-sans">Edit kategori</button>
                  <button onClick={() => setIsDetailOpen(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-normal uppercase tracking-widest shadow-xl active:scale-95 transition-all font-sans">Tutup</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
