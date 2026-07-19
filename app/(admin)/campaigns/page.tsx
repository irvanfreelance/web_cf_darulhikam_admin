"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  Plus, Search, Edit, Trash2, Eye, GripVertical, X, Save, Loader2, Copy, Image as ImageIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatIDR = (amount: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

function SortableRow({ camp, idx, offset, formatIDR, router, handleDelete, handleDuplicate }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: camp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      onMouseEnter={() => router.prefetch(`/campaigns/${camp.id}`)}
      className={cn(
        "hover:bg-slate-50/50 transition-colors group",
        isDragging && "bg-slate-50 shadow-2xl ring-2 ring-teal-500/20"
      )}
    >
      <td className="px-6 py-5 text-center text-xs font-normal text-slate-400">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-4">{offset + idx + 1}</span>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:text-slate-600 transition-colors">
            <GripVertical size={14} />
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-800 line-clamp-1 group-hover:text-teal-600 transition-colors">
            {camp.title}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">@{camp.slug}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className="px-3 py-1 rounded-full text-[10px] font-normal border bg-teal-50 text-teal-600 border-teal-100">
          {camp.category_name}
        </span>
      </td>
      <td className="px-6 py-5 text-center">
        {camp.is_carousel ? (
          <div className="flex flex-col items-center gap-1">
             <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg" title="Aktif di Carousel">
               <ImageIcon size={14} />
             </div>
             <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Carousel</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-300 font-medium">—</span>
        )}
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col gap-1.5 min-w-[150px] text-left">
          <div className="flex justify-between items-end">
            <span className="font-semibold text-slate-800 text-sm leading-none">{formatIDR(camp.collected_amount)}</span>
            {camp.target_amount > 0 && (
              <span className="text-[10px] text-slate-400 font-normal leading-none">
                {Math.min(((camp.collected_amount / camp.target_amount) * 100), 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                camp.status === 'ACTIVE' ? "bg-teal-500" : "bg-slate-300"
              )}
              style={{ width: `${camp.target_amount ? Math.min((camp.collected_amount / camp.target_amount) * 100, 100) : 100}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium line-clamp-1">
            {camp.target_amount ? `Target: ${formatIDR(camp.target_amount)}` : 'Tanpa batas dana'}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-normal border shadow-sm",
          camp.status === 'ACTIVE' ? "bg-teal-50 text-teal-700 border-teal-100" :
          camp.status === 'INACTIVE' ? "bg-slate-50 text-slate-400 border-slate-100" :
          "bg-amber-50 text-amber-600 border-amber-100"
        )}>
          {camp.status === 'ACTIVE' ? 'Aktif' : camp.status === 'INACTIVE' ? 'Nonaktif' : 'Draft'}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex justify-center gap-1">
          <button onClick={() => router.push(`/campaigns/${camp.id}`)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="Detail Performa"><Eye size={18} /></button>
          <button onClick={() => router.push(`/campaigns/${camp.id}/edit`)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all" title="Edit Kampanye"><Edit size={18} /></button>
          <button onClick={() => handleDuplicate(camp)} className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all" title="Duplicate Kampanye"><Copy size={18} /></button>
          <button onClick={() => handleDelete(camp.id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" title="Hapus"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const { data: categories } = useSWR('/api/categories', fetcher);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('0');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', category_id: 0, slug: '', image_url: '', description: '',
    target_amount: 0, end_date: '', is_zakat: false, is_qurban: false, 
    has_no_target: false, is_urgent: false, is_verified: true, is_carousel: false, status: 'ACTIVE'
  });

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    category_id: categoryFilter,
    status: statusFilter,
    search: search
  });

  const { data: campaigns, error, isLoading, mutate } = useSWR(`/api/campaigns?${queryParams.toString()}`, fetcher);

  const totalCount = campaigns?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = campaigns.findIndex((c: any) => c.id === active.id);
      const newIndex = campaigns.findIndex((c: any) => c.id === over.id);
      
      const newItems = arrayMove(campaigns, oldIndex, newIndex);
      mutate(newItems, false); // Optimistic update

      try {
        const items = newItems.map((item: any, index: number) => ({
          id: item.id,
          sort: offset + index
        }));
        
        const res = await fetch('/api/campaigns/sort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        
        if (!res.ok) throw new Error('Failed to save sort order');
        toast.success('Urutan diperbarui');
      } catch (err: any) {
        toast.error(err.message);
        mutate(); // Revert on failure
      }
    }
  };

  const handleDelete = (id: number) => {
    toast('Hapus kampanye ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Kampanye dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  const handleDuplicate = async (camp: any) => {
    toast('Duplikasi kampanye ini?', {
      action: {
        label: 'Duplikat',
        onClick: async () => {
          try {
            const body = {
              title: `${camp.title} (Copy)`,
              category_id: camp.category_id,
              slug: `${camp.slug}-copy`,
              image_url: camp.image_url,
              description: camp.description,
              target_amount: camp.target_amount,
              end_date: camp.end_date,
              is_zakat: camp.is_zakat,
              is_qurban: camp.is_qurban,
              has_no_target: camp.has_no_target,
              is_urgent: camp.is_urgent,
              is_verified: camp.is_verified,
              is_carousel: camp.is_carousel,
              status: camp.status,
            };
            const res = await fetch('/api/campaigns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to duplicate campaign');
            toast.success('Kampanye berhasil diduplikat');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-normal bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = selectedCamp ? 'PATCH' : 'POST';
      const body = selectedCamp ? { id: selectedCamp.id, ...formData } : formData;
      const res = await fetch('/api/campaigns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save campaign');
      toast.success(selectedCamp ? 'Kampanye diperbarui' : 'Kampanye berhasil dibuat');
      mutate();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manajemen Kampanye" 
        description="Kelola program donasi & qurban"
      >
        <Button 
          onClick={() => router.push('/campaigns/new')}
          className="shrink-0"
        >
          <Plus size={18} strokeWidth={3} /> Buat Kampanye
        </Button>
      </PageHeader>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] group text-left">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <Input 
            type="text" 
            placeholder="Cari judul kampanye..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 h-10 w-full" 
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <SearchableSelect 
              value={categoryFilter}
              onChange={(val) => { setCategoryFilter(String(val)); setPage(1); }}
              options={[
                { id: '0', name: 'Semua kategori' },
                ...(categories?.map((cat: any) => ({ id: String(cat.id), name: cat.name })) || [])
              ]}
              className="h-10"
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchableSelect 
              value={statusFilter}
              onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { id: 'ALL', name: 'Semua status' },
                { id: 'ACTIVE', name: 'Aktif' },
                { id: 'INACTIVE', name: 'Nonaktif' },
                { id: 'DRAFT', name: 'Draft' }
              ]}
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-normal">
                  <th className="px-6 py-4 border-b border-slate-100 font-bold w-12 text-center">#</th>
                  <th className="px-6 py-4 border-b border-slate-100 font-bold">Judul Kampanye</th>
                  <th className="px-6 py-4 border-b border-slate-100 font-bold">Kategori</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Carousel</th>
                  <th className="px-6 py-4 border-b border-slate-100 font-bold">Progres Donasi</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Status</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/20"></td>
                    </tr>
                  ))
                ) : campaigns?.length > 0 ? (
                  <SortableContext 
                    items={campaigns.map((c: any) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {campaigns.map((camp: any, idx: number) => (
                      <SortableRow 
                        key={camp.id} 
                        camp={camp} 
                        idx={idx} 
                        offset={offset} 
                        formatIDR={formatIDR}
                        router={router}
                        handleDelete={handleDelete}
                        handleDuplicate={handleDuplicate}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada kampanye ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>

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
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{selectedCamp ? 'Edit kampanye' : 'Kampanye baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
              <div className="col-span-2 text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2">Judul kampanye</label>
                <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2">Slug URL</label>
                <input required value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2">Kategori</label>
                <SearchableSelect 
                  value={formData.category_id}
                  onChange={(val) => setFormData({...formData, category_id: Number(val)})}
                  options={categories?.map((cat: any) => ({ id: cat.id, name: cat.name })) || []}
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2">Target dana (opsional)</label>
                <input type="number" value={formData.target_amount} onChange={(e) => setFormData({...formData, target_amount: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2">Tanggal berakhir</label>
                <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                {['is_zakat', 'is_qurban', 'has_no_target', 'is_urgent', 'is_carousel'].map((field) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1 min-w-[120px]">
                    <input type="checkbox" checked={(formData as any)[field]} onChange={(e) => setFormData({...formData, [field]: e.target.checked})} className="w-4 h-4 text-teal-600 rounded border-slate-300" />
                    <span className="text-[10px] font-semibold text-slate-600">{field.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
              <div className="col-span-2 pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-6 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all font-sans">Batal</button>
                <button disabled={isSubmitting} className="flex-[2] bg-teal-600 text-white py-4 px-6 rounded-2xl text-sm font-bold shadow-xl shadow-teal-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 font-sans">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan kampanye
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

