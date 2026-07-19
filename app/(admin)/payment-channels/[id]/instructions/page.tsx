"use client";

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Edit, Trash2, X, Save, GripVertical, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Pagination } from '@/components/shared/pagination';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SortableRow({ item, index, onEdit, onDelete }: { item: any, index: number, onEdit: any, onDelete: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  const formattedDate = new Date(item.created_at).toLocaleDateString('en-US');

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "hover:bg-slate-50/50 transition-colors group bg-white",
        isDragging && "shadow-xl border-indigo-500 scale-[1.01]"
      )}
    >
      <td className="px-6 py-5 text-slate-300 w-16 text-center">
        <button {...attributes} {...listeners} className="p-1 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-6 py-5 w-16 text-center font-bold text-slate-800">
        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-xs bg-slate-50">{index}</div>
      </td>
      <td className="px-6 py-5 font-bold text-slate-800 text-sm">{item.title}</td>
      <td className="px-6 py-5 text-xs text-slate-500 font-normal">{formattedDate}</td>
      <td className="px-6 py-5 w-24">
        <div className="flex gap-1 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
          <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function PaymentInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const paymentMethodId = params.id as string;
  
  const { data: channels } = useSWR(`/api/payment-methods`, fetcher);
  const channel = channels?.find((c: any) => c.id.toString() === paymentMethodId);

  const { data: remoteData, error, isLoading } = useSWR(`/api/payment-instructions?payment_method_id=${paymentMethodId}`, fetcher);
  
  const [items, setItems] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (remoteData) {
      setItems(remoteData);
    }
  }, [remoteData]);

  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sort_order: index + 1
      }));
      setItems(newItems);

      try {
        const payload = newItems.map(({ id, sort_order }) => ({ id, sort_order }));
        await fetch('/api/payment-instructions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        toast.error('Failed to save order');
      }
    }
  };

  const handleOpenEdit = (item: any = null) => {
    setSelectedItem(item);
    if (item) {
      setFormData({ title: item.title, content: item.content });
    } else {
      setFormData({ title: '', content: '' });
    }
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setSelectedItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Judul dan deskripsi wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const method = selectedItem ? 'PATCH' : 'POST';
      const body = selectedItem 
        ? { id: selectedItem.id, ...formData } 
        : { payment_method_id: Number(paymentMethodId), ...formData };

      const res = await fetch('/api/payment-instructions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save instruction');
      
      toast.success(selectedItem ? 'Instruction updated' : 'Instruction created');
      mutate(`/api/payment-instructions?payment_method_id=${paymentMethodId}`);
      handleCloseEdit();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    toast('Hapus instruksi ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/payment-instructions?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Instruksi berhasil dihapus');
            mutate(`/api/payment-instructions?payment_method_id=${paymentMethodId}`);
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-normal bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/payment-channels')} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="flex-1 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Payment Instructions</h1>
            <p className="text-slate-500 mt-1">{channel ? `${channel.name} (${channel.code})` : 'Loading...'}</p>
          </div>
          {!isEditing && (
            <Button onClick={() => handleOpenEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 shadow-indigo-500/20 shadow-lg shrink-0">
              <Plus size={16} strokeWidth={3} className="mr-2" /> Tambah Instruksi
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{selectedItem ? 'Edit Instruksi Pembayaran' : 'Tambah Instruksi Pembayaran'}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Judul Instruksi</label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                placeholder="E.g. Pembayaran dengan Mobile Banking" 
                className="h-12 bg-slate-50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Deskripsi Detail</label>
              <RichTextEditor 
                value={formData.content}
                onChange={(html) => setFormData({...formData, content: html})}
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 right-0">
            <Button type="button" variant="outline" onClick={handleCloseEdit} className="bg-white hover:bg-slate-100">
              <X size={16} className="mr-2" /> Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Update
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="text-lg font-bold text-slate-800 tracking-tight">Daftar Instruksi Pembayaran ({items.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold">
                  <th className="px-6 py-4 border-b border-slate-100 w-16 text-center">Drag</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-16 text-center">No</th>
                  <th className="px-6 py-4 border-b border-slate-100">Judul</th>
                  <th className="px-6 py-4 border-b border-slate-100">Tanggal Dibuat</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <SortableContext items={paginatedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="h-16 px-6 py-5 bg-slate-50/20"></td></tr>)
                  ) : paginatedItems.length > 0 ? (
                    paginatedItems.map((item, index) => (
                      <SortableRow 
                        key={item.id} 
                        item={item} 
                        index={offset + index + 1}
                        onEdit={handleOpenEdit} 
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Tidak ada instruksi pembayaran.</td></tr>
                  )}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
        {!isLoading && totalCount > limit && (
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
    </div>
  );
}
