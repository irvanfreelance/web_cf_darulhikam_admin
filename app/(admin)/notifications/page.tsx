"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  BellRing, Mail, MessageSquare, Plus, Search, Edit, Trash2, X, Save, Loader2, Info,
  Eye, Calendar, Hash, Type, Smartphone, CheckCircle2, XCircle, LayoutGrid, List
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Pagination } from '@/components/shared/pagination';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'CARD' | 'TABLE'>('TABLE');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const { data: templates, error, isLoading, mutate } = useSWR(
    `/api/notification-templates?limit=${limit}&offset=${offset}&search=${search}`, 
    fetcher
  );

  const totalCount = templates?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    event_trigger: '', channel: 'WHATSAPP', message_content: '', is_active: true 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (template: any = null) => {
    setSelectedTemplate(template);
    if (template) {
      setFormData({ 
        event_trigger: template.event_trigger, 
        channel: template.channel, 
        message_content: template.message_content, 
        is_active: template.is_active 
      });
    } else {
      setFormData({ event_trigger: '', channel: 'WHATSAPP', message_content: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (template: any) => {
    setSelectedTemplate(template);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = selectedTemplate ? 'PATCH' : 'POST';
      const body = selectedTemplate ? { id: selectedTemplate.id, ...formData } : formData;
      const res = await fetch('/api/notification-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save template');
      toast.success(selectedTemplate ? 'Template diperbarui' : 'Template berhasil dibuat');
      mutate();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    toast('Hapus template ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/notification-templates?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Template berhasil dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-semibold bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Template Notifikasi</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Atur pesan otomatis sistem</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white border border-slate-100 p-1 rounded-2xl shadow-sm">
             <button onClick={() => setView('CARD')} className={cn("p-2 rounded-xl transition-all", view === 'CARD' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}><LayoutGrid size={18} /></button>
             <button onClick={() => setView('TABLE')} className={cn("p-2 rounded-xl transition-all", view === 'TABLE' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}><List size={18} /></button>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-normal flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> Tambah template
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari template..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-blue-500/50" 
          />
        </div>
      </div>

      {view === 'CARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-64 bg-white rounded-2xl animate-pulse border border-slate-100"></div>)
          ) : templates?.length > 0 ? (
            templates.map((t: any) => (
              <div key={t.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden text-left">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                      t.channel === 'WHATSAPP' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                    )}>
                      {t.channel === 'WHATSAPP' ? <MessageSquare size={20} /> : <Mail size={20} />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 tracking-tight text-sm leading-tight">{t.event_trigger}</h3>
                      <p className="text-[10px] font-medium text-slate-400">{t.channel}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-normal border shadow-sm",
                    t.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {t.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 mt-2 mb-6 text-sm text-slate-600 font-medium leading-relaxed italic relative min-h-[100px] flex items-center">
                  <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-medium text-slate-300">Pratinjau pesan</span>
                  "{t.message_content}"
                </div>

                <div className="flex gap-2 transition-opacity">
                  <button onClick={() => handleOpenDetail(t)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                  <button 
                    onClick={() => handleOpenModal(t)}
                    className="flex-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-3 rounded-xl text-[10px] font-normal flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Edit size={14} /> Edit template
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 italic">No templates found.</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-normal">
                  <th className="px-6 py-4 border-b border-slate-100 w-12 text-center">#</th>
                  <th className="px-6 py-4 border-b border-slate-100">Event Trigger</th>
                  <th className="px-6 py-4 border-b border-slate-100">Channel</th>
                  <th className="px-6 py-4 border-b border-slate-100">Konten Pesan</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(limit)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 px-6 py-4 bg-slate-50/20"></td></tr>)
                ) : templates?.length > 0 ? (
                  templates.map((t: any, idx: number) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 text-center text-xs font-medium text-slate-400">
                        {offset + idx + 1}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                         <span className="text-sm font-normal text-slate-800 tracking-tight">{t.event_trigger}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                         <div className={cn(
                           "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-semibold",
                           t.channel === 'WHATSAPP' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                         )}>
                           {t.channel === 'WHATSAPP' ? <MessageSquare size={14} /> : <Mail size={14} />} {t.channel}
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-xs font-medium text-slate-500 truncate max-w-[300px]">{t.message_content}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border shadow-sm",
                           t.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                         )}>
                           {t.is_active ? 'AKTIF' : 'NONAKTIF'}
                         </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-1 transition-opacity">
                          <button onClick={() => handleOpenDetail(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                          <button onClick={() => handleOpenModal(t)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Edit size={18} /></button>
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">No templates found.</td></tr>
                )}
              </tbody>
            </table>
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
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">Editor template</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 font-sans">Event trigger</label>
                  <input required value={formData.event_trigger} onChange={(e) => setFormData({...formData, event_trigger: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all" placeholder="Cth: Welcome msg" />
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 font-sans">Channel</label>
                  <select value={formData.channel} onChange={(e) => setFormData({...formData, channel: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 bg-white outline-none focus:border-blue-500 transition-all">
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-semibold text-slate-500 mb-2 font-sans">Konten pesan</label>
                <textarea 
                  required 
                  rows={4}
                  value={formData.message_content} 
                  onChange={(e) => setFormData({...formData, message_content: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm font-normal text-slate-900 leading-relaxed outline-none focus:border-blue-500 transition-all font-sans" 
                  placeholder="Gunakan variabel seperti {nama}, {nominal}, dll..."
                />
                <div className="mt-2 flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                  <Info size={16} className="shrink-0" />
                  <p className="text-[10px] font-medium tracking-tight leading-tight">Variabel: &#123;nama&#125;, &#123;nominal&#125;, &#123;invoice_code&#125;, &#123;metode&#125;, &#123;va_number&#125;.</p>
                </div>
              </div>
              <div className="pt-2 flex gap-3 text-left">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-6 rounded-2xl text-sm font-normal text-slate-400 hover:text-slate-600 transition-all font-sans">Batal</button>
                <button disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-4 px-6 rounded-2xl text-sm font-normal shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 font-sans">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">Detail template notifikasi</h2>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-8 text-left">
               <div className="flex items-center gap-6">
                 <div className={cn(
                   "w-20 h-20 rounded-3xl flex items-center justify-center border border-white shadow-xl transition-transform hover:scale-105",
                   selectedTemplate.channel === 'WHATSAPP' ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-blue-500 text-white shadow-blue-200"
                 )}>
                   {selectedTemplate.channel === 'WHATSAPP' ? <Smartphone size={40} strokeWidth={1.5} /> : <Mail size={40} strokeWidth={1.5} />}
                 </div>
                 <div className="text-left">
                   <h3 className="text-2xl font-normal text-slate-800 tracking-tight leading-tight uppercase mb-1">{selectedTemplate.event_trigger}</h3>
                   <div className="flex items-center gap-2">
                       <span className={cn(
                         "px-2.5 py-1 rounded-lg text-[9px] font-normal border shadow-sm",
                         selectedTemplate.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                       )}>{selectedTemplate.is_active ? 'Status Aktif' : 'Status Nonaktif'}</span>
                       <span className="text-[10px] font-normal text-slate-400 border border-slate-100 px-2 py-1 rounded-lg bg-slate-50">{selectedTemplate.channel} Channel</span>
                   </div>
                 </div>
               </div>

               <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 text-slate-200/50 group-hover:text-blue-500/10 transition-colors">
                    <MessageSquare size={120} strokeWidth={1} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-normal text-slate-400 mb-4 flex items-center gap-2"><Type size={12}/> Pesan yang dikirim</p>
                    <div className="text-lg font-normal text-slate-700 tracking-tight leading-relaxed italic font-serif">
                      "{selectedTemplate.message_content}"
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><Calendar size={12}/> Dibuat tanggal</p>
                    <p className="text-sm font-normal text-slate-800 uppercase tracking-tight">{new Date(selectedTemplate.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><Hash size={12}/> Template id</p>
                    <p className="text-sm font-normal text-slate-800 tracking-tight">#{selectedTemplate.id}</p>
                  </div>
               </div>

               <div className="flex gap-3 pt-2">
                  <button onClick={() => { setIsDetailOpen(false); handleOpenModal(selectedTemplate); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-normal uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all font-sans">EDIT TEMPLATE</button>
                  <button onClick={() => setIsDetailOpen(false)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-normal uppercase tracking-widest shadow-xl active:scale-95 transition-all font-sans">TUTUP</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
