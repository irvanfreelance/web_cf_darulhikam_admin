"use client";

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit, Trash2, X, Save, GripVertical, FileText, Loader2, Image as ImageIcon, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/ui/file-upload';
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

// Display labels for slug-based enum values
const TYPE_LABELS: Record<string, string> = {
  e_wallet: 'E-Wallet',
  bank_transfer: 'Bank Transfer',
  va: 'Virtual Account',
  qris: 'QRIS',
  manual_transfer: 'Manual Transfer',
  retail_outlet: 'Retail Outlet',
  qr_code: 'QR Code',
};

const PROVIDER_LABELS: Record<string, string> = {
  midtrans: 'Midtrans',
  xendit: 'Xendit',
  manual: 'Manual',
  moota: 'Moota',
  faspay: 'Faspay',
};

const typeLabel = (v: string) => TYPE_LABELS[v] ?? v;
const providerLabel = (v: string) => PROVIDER_LABELS[v] ?? v;

function SortableRow({ item, onEdit, onDelete, onInstructions, onDuplicate }: { item: any, onEdit: any, onDelete: any, onInstructions: any, onDuplicate: any }) {
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-slate-50/50 transition-colors group bg-white",
        isDragging && "shadow-xl border-indigo-500 scale-[1.01]"
      )}
    >
      <td className="px-6 py-5 text-slate-300">
        <button {...attributes} {...listeners} className="p-1 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-6 py-5">
        <div className="w-16 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
          {item.logo_url ? (
            <img src={item.logo_url} alt={item.name} className="w-full h-full object-contain p-1" />
          ) : (
            <ImageIcon size={16} className="text-slate-300" />
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-800 text-sm tracking-tight">{item.name}</span>
          <span className="text-[10px] text-slate-400 font-medium">{item.code}</span>
        </div>
      </td>
      <td className="px-6 py-5 text-sm font-normal text-slate-600">
        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">{providerLabel(item.provider)}</Badge>
      </td>
      <td className="px-6 py-5">
        <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-none">{typeLabel(item.type)}</Badge>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col items-start gap-1">
          <Badge variant={item.is_active ? 'success' : 'secondary'} className="rounded-full px-3">{item.is_active ? 'Active' : 'Inactive'}</Badge>
          {item.is_redirect && <Badge variant="outline" className="text-[9px] text-slate-500 rounded-full px-2">Redirect</Badge>}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex gap-1 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm" title="Edit"><Edit size={16} /></button>
          <button onClick={() => onDuplicate(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm" title="Duplicate"><Copy size={16} /></button>
          <button onClick={() => onInstructions(item.id)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm" title="Instructions"><FileText size={16} /></button>
          <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm" title="Delete"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function PaymentChannelsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: remoteData, error, isLoading } = useSWR(`/api/payment-methods?search=${search}`, fetcher);

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
    code: string, name: string, logo_url: string, type: string, provider: string,
    is_active: boolean, is_redirect: boolean, logo_file: File | null
  }>({
    code: '', name: '', logo_url: '', type: 'bank_transfer', provider: 'moota',
    is_active: true, is_redirect: false, logo_file: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

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
        await fetch('/api/payment-methods', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        toast.error('Failed to save order');
      }
    }
  };

  const handleOpenModal = (item: any = null) => {
    setSelectedItem(item);
    setPreviewUrl(null);
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        logo_url: item.logo_url || '',
        type: item.type,
        provider: item.provider,
        is_active: item.is_active,
        is_redirect: item.is_redirect,
        logo_file: null
      });
    } else {
      setFormData({
        code: '', name: '', logo_url: '', type: 'bank_transfer', provider: 'moota',
        is_active: true, is_redirect: false, logo_file: null
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    // revoke previous object URL to prevent memory leak
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFormData((prev) => ({ ...prev, logo_file: file }));
  };

  const handleClearLogo = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, logo_url: '', logo_file: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalLogoUrl = formData.logo_url;
      if (formData.logo_file) {
        toast('Mengupload gambar ke server...');
        const fileForm = new FormData();
        fileForm.append('file', formData.logo_file);

        // Use normal body or fetch directly for Vercel Blob
        // Note: API expects filename query param and body=file
        const response = await fetch(`/api/upload?filename=${formData.logo_file.name}`, {
          method: 'POST',
          body: formData.logo_file,
        });
        if (!response.ok) throw new Error('Gagal mengupload gambar');
        const blobRes = await response.json();
        finalLogoUrl = blobRes.url;
      }

      const method = selectedItem ? 'PATCH' : 'POST';
      const { logo_file, ...restData } = formData;
      const body = selectedItem ? { id: selectedItem.id, ...restData, logo_url: finalLogoUrl } : { ...restData, logo_url: finalLogoUrl };

      const res = await fetch('/api/payment-methods', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save payment channel');
      toast.success(selectedItem ? 'Channel updated' : 'Channel created');
      mutate(`/api/payment-methods?search=${search}`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    toast('Hapus channel ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Channel berhasil dihapus');
            mutate(`/api/payment-methods?search=${search}`);
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  const handleDuplicate = async (item: any) => {
    toast('Duplikasi channel ini?', {
      action: {
        label: 'Duplikat',
        onClick: async () => {
          try {
            const { id, ...restData } = item;
            const body = {
              ...restData,
              name: `${item.name} (Copy)`,
              code: `${item.code}-COPY`,
            };
            const res = await fetch('/api/payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to duplicate channel');
            toast.success('Channel berhasil diduplikat');
            mutate(`/api/payment-methods?search=${search}`);
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
      <div className="flex justify-between items-end mb-8">
        <PageHeader
          title="Payment Channels"
          description="Kelola metode pembayaran dan integrasinya"
          className="mb-0 text-left"
        />
        <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 shadow-indigo-500/20 shadow-lg shrink-0">
          <Plus size={16} strokeWidth={3} className="mr-2" /> Tambah Payment Channel
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Cari Payment Channel</h3>
        <div className="relative group text-left max-w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input
            type="text"
            placeholder="Cari berdasarkan nama, code, vendor, atau category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 py-6 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Daftar Payment Channels ({items.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold">
                  <th className="px-6 py-4 border-b border-slate-100 w-16 text-center">Drag</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-24">Logo</th>
                  <th className="px-6 py-4 border-b border-slate-100">Payment Info</th>
                  <th className="px-6 py-4 border-b border-slate-100">Vendor</th>
                  <th className="px-6 py-4 border-b border-slate-100">Category</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-32">Status</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <SortableContext items={paginatedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={7} className="h-20 px-6 py-5 bg-slate-50/20"></td></tr>)
                  ) : paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        onEdit={handleOpenModal}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onInstructions={(id: number) => router.push(`/payment-channels/${id}/instructions`)}
                      />
                    ))
                  ) : (
                    <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 italic">Tidak ada data.</td></tr>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {selectedItem ? 'Edit Payment Channel' : 'Tambah Payment Channel'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Payment Code *</label>
                  <Input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="E.g. 1080011701" className="h-12 bg-slate-50 font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Payment Name *</label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="E.g. Transfer Muamalat" className="h-12 bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Vendor</label>
                  <SearchableSelect
                    value={formData.provider}
                    onChange={(val) => setFormData({ ...formData, provider: String(val) })}
                    options={[
                      { id: 'moota', name: 'Moota' },
                      { id: 'faspay', name: 'Faspay' },
                      { id: 'midtrans', name: 'Midtrans' },
                      { id: 'xendit', name: 'Xendit' },
                      { id: 'manual', name: 'Manual' }
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800">Category</label>
                  <SearchableSelect
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: String(val) })}
                    options={[
                      { id: 'bank_transfer', name: 'Bank Transfer' },
                      { id: 'e_wallet', name: 'E-Wallet' },
                      { id: 'va', name: 'Virtual Account' },
                      { id: 'qris', name: 'QRIS' },
                      { id: 'manual_transfer', name: 'Manual Transfer' },
                      { id: 'retail_outlet', name: 'Retail Outlet' },
                      { id: 'qr_code', name: 'QR Code' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-800">Logo Payment Channel</label>

                {/* Hidden native file input for re-picking */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />

                {(previewUrl || formData.logo_url) ? (
                  <div className="relative group w-full h-36 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                    <img
                      src={previewUrl || formData.logo_url}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain p-4"
                    />
                    {/* Ganti Gambar overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-800 text-xs font-semibold rounded-lg shadow hover:bg-slate-100 transition-colors"
                      >
                        <ImageIcon size={13} /> Ganti Gambar
                      </button>
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-lg shadow hover:bg-rose-600 transition-colors"
                      >
                        <X size={13} /> Hapus
                      </button>
                    </div>
                    {/* Filename badge (only for local file not yet uploaded) */}
                    {formData.logo_file && !formData.logo_url && (
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full truncate max-w-[80%]">
                        {formData.logo_file.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <ImageIcon size={22} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-600">Upload gambar atau file</p>
                      <p className="text-xs text-slate-400 mt-0.5">Max 4.5MB • PNG, JPG, WEBP</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-8 py-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="sr-only" />
                    <div className={cn("w-12 h-6 rounded-full transition-colors", formData.is_active ? 'bg-emerald-500' : 'bg-slate-200')}></div>
                    <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm", formData.is_active ? 'translate-x-6' : 'translate-x-0')}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-800">Active</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={formData.is_redirect} onChange={(e) => setFormData({ ...formData, is_redirect: e.target.checked })} className="sr-only" />
                    <div className={cn("w-12 h-6 rounded-full transition-colors", formData.is_redirect ? 'bg-blue-500' : 'bg-slate-200')}></div>
                    <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm", formData.is_redirect ? 'translate-x-6' : 'translate-x-0')}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-800">Redirect</span>
                </label>
              </div>

            </form>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="bg-white">Batal</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Perbarui
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
