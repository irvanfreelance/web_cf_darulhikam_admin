"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Edit, Share2, Users, Eye, Calendar, 
  ArrowUpRight, MessageSquare, Wallet, Clock, CheckCircle2,
  Plus, X, Loader2, Image as ImageIcon,
  Layers, Package, QrCode, Tags
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Pagination } from '@/components/shared/pagination';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatIDR = (amount: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

export default function CampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: campaign, error, isLoading, mutate } = useSWR(`/api/campaigns/${id}`, fetcher);
  const [activeTab, setActiveTab] = useState('transactions');
  const [updatePage, setUpdatePage] = useState(1);
  const updateLimit = 5;

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    title: string; excerpt: string; content: string; image_url: string; image_file: File | null;
  }>({ title: '', excerpt: '', content: '', image_url: '', image_file: null });

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const res = await fetch('/api/campaign-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: parseInt(id as string),
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          image_url: finalImageUrl
        }),
      });
      
      if (!res.ok) throw new Error('Gagal menyimpan kabar penyaluran');
      toast.success('Kabar ditambahkan');
      setIsUpdateModalOpen(false);
      setFormData({ title: '', excerpt: '', content: '', image_url: '', image_file: null });
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTotalPages = campaign?.updates ? Math.ceil(campaign.updates.length / updateLimit) : 0;
  const paginatedUpdates = campaign?.updates ? campaign.updates.slice((updatePage - 1) * updateLimit, updatePage * updateLimit) : [];

  if (isLoading) return <div className="p-8 animate-pulse space-y-8">
    <div className="h-12 w-1/3 bg-slate-100 rounded-2xl"></div>
    <div className="grid grid-cols-3 gap-6">
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
      <div className="col-span-2 h-64 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>;

  if (error || !campaign) return <div className="p-8 text-rose-500 font-bold">Error loading campaign</div>;

  const progress = campaign.target_amount ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100) : 100;
  const remaining = campaign.target_amount ? Math.max(campaign.target_amount - campaign.collected_amount, 0) : 0;
  
  const daysLeft = campaign.end_date 
    ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : '∞';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-medium text-slate-800 tracking-tight">{campaign.title}</h1>
            <p className="text-sm text-slate-400 font-normal mt-1 uppercase tracking-wider">
              {campaign.category_name} • {campaign.has_no_target ? 'Open Amount' : 'Target Goal'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => router.push(`/campaigns/${id}/edit`)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Edit size={18} /> Edit
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl text-sm font-medium hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20">
            <Share2 size={18} /> Bagikan Link
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Progress Card */}
        <div className="lg:col-span-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative z-10 text-center space-y-6 w-full">
            <p className="text-sm font-normal text-slate-800 tracking-tight uppercase">Status Pendanaan</p>
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">Pencapaian dari Target</p>
            
            <div className="relative flex justify-center py-4">
               {/* Progress Circle (Simplified SVG) */}
               <svg className="w-48 h-24 transform rotate-0" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F1F5F9" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#0D9488" strokeWidth="8" strokeLinecap="round" 
                    strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - progress/100)} 
                  />
               </svg>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-4">
                  <p className="text-4xl font-bold text-slate-800 leading-none">{progress.toFixed(1)}%</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">Terkumpul</p>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50 w-full">
              <div className="flex justify-between items-center text-left">
                <span className="text-xs font-normal text-slate-400">Terkumpul</span>
                <span className="text-sm font-medium text-emerald-600">{formatIDR(campaign.collected_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-left">
                <span className="text-xs font-normal text-slate-400">Kekurangan</span>
                <span className="text-sm font-normal text-rose-500">{formatIDR(remaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart & Mini Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18} /></div>
                 <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest leading-none">Donatur</span>
               </div>
               <p className="text-3xl font-normal text-slate-800">{campaign.donor_count?.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Eye size={18} /></div>
                 <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest leading-none">Views</span>
               </div>
               <p className="text-3xl font-normal text-slate-800">{campaign.views_count?.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={18} /></div>
                 <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest leading-none">Sisa Hari</span>
               </div>
               <p className="text-3xl font-normal text-slate-800">{daysLeft}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex-1 relative min-h-[300px]">
            <div className="flex justify-between items-center mb-8">
               <div className="text-left">
                 <h3 className="text-sm font-normal text-slate-800 tracking-tight">Pertumbuhan Donasi</h3>
                 <p className="text-[10px] font-normal text-slate-400">7 Hari terakhir</p>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                 <ArrowUpRight size={14} />
                 <span className="text-[10px] font-bold">+12.5%</span>
               </div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={campaign.chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'black', color: '#1E293B' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Relations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Variants Subcard */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Tags size={18} /></div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Varian Paket</h4>
                  <p className="text-[10px] text-slate-400">{campaign.variants?.length || 0} varian terdaftar</p>
                </div>
              </div>
              <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><Edit size={11} /> Edit</button>
            </div>
            {campaign.variants?.length > 0 ? (
              <ul className="space-y-2 flex-1">
                {campaign.variants.map((v: any) => (
                  <li key={v.id} className="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-medium text-slate-700">{v.name}</span>
                      {!v.is_active && <span className="ml-2 text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">NONAKTIF</span>}
                      {v.stock_limit && <span className="ml-2 text-[9px] text-slate-400">Stok: {v.stock_limit}</span>}
                    </div>
                    <span className="text-indigo-600 font-bold">{formatIDR(v.price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <Tags size={24} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 italic">Belum ada varian paket</p>
                <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="mt-3 text-[10px] font-semibold text-indigo-500 underline">+ Tambah sekarang</button>
              </div>
            )}
         </div>

         {/* Bundles Subcard */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Package size={18} /></div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Bundling Kampanye</h4>
                  <p className="text-[10px] text-slate-400">{campaign.bundles?.length || 0} item dibundling</p>
                </div>
              </div>
              <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="text-[10px] font-semibold text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><Edit size={11} /> Edit</button>
            </div>
            {campaign.bundles?.length > 0 ? (
              <ul className="space-y-2 flex-1">
                {campaign.bundles.map((b: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center text-sm bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700 truncate leading-tight">{b.item_title || `ID: ${b.item_campaign_id}`}</span>
                    <span className="text-amber-600 font-bold text-xs shrink-0 ml-2">×{b.qty}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <Package size={24} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 italic">Bukan tipe bundle</p>
                <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="mt-3 text-[10px] font-semibold text-amber-500 underline">+ Tambah bundle</button>
              </div>
            )}
         </div>

         {/* QRIS Static Subcard */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><QrCode size={18} /></div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">QRIS Statis</h4>
                  <p className="text-[10px] text-slate-400">{campaign.qris_static?.length || 0} QRIS terdaftar</p>
                </div>
              </div>
              <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="text-[10px] font-semibold text-teal-500 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><Edit size={11} /> Edit</button>
            </div>
            {campaign.qris_static?.length > 0 ? (
              <ul className="space-y-2 flex-1">
                {campaign.qris_static.map((q: any) => (
                  <li key={q.id} className="flex flex-col text-sm bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-teal-600 text-xs truncate">{q.external_id}</span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", q.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600')}>{q.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono break-all bg-white p-1.5 rounded border border-slate-100 line-clamp-2">{q.qris_string}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <QrCode size={24} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 italic">Tidak ada QRIS Static</p>
                <button onClick={() => router.push(`/campaigns/${id}/edit`)} className="mt-3 text-[10px] font-semibold text-teal-500 underline">+ Daftarkan QRIS</button>
              </div>
            )}
         </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 p-2">
          {[
            { id: 'transactions', label: 'Riwayat Transaksi', icon: Wallet },
            { id: 'updates', label: 'Kabar Penyaluran', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-8 py-5 text-sm font-normal transition-all relative border-b-2",
                activeTab === tab.id ? "text-teal-600 border-teal-500 bg-teal-50/30" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50/50"
              )}
            >
              <tab.icon size={18} className={activeTab === tab.id ? "text-teal-500" : "text-slate-400"} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-2">
          {activeTab === 'transactions' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-4">Tanggal</th>
                    <th className="px-8 py-4">Donatur</th>
                    <th className="px-8 py-4 text-right">Nominal</th>
                    <th className="px-8 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaign.transactions?.map((trx: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5 text-xs font-normal text-slate-400">{formatDate(trx.time)}</td>
                      <td className="px-8 py-5 font-normal text-slate-800 text-sm">{trx.donor_name_snapshot}</td>
                      <td className="px-8 py-5 text-right font-normal text-emerald-600 text-sm">{formatIDR(trx.amount)}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-normal uppercase tracking-tighter border",
                          trx.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {trx.status === 'PAID' ? 'Success' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {campaign.transactions?.length === 0 && (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic font-medium">Belum ada transaksi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 space-y-6 relative">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800">Timeline Kabar Penyaluran</h3>
                 <Button onClick={() => setIsUpdateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"><Plus size={16} className="mr-2" /> Tambah Kabar</Button>
               </div>
               
               {paginatedUpdates.map((update: any) => (
                 <div key={update.id} className="flex gap-6 text-left p-6 rounded-2xl bg-slate-50 border border-slate-100/50">
                    <div className="w-24 h-24 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden shrink-0">
                      {update.image_url ? <img src={update.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>}
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-start">
                         <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">{formatDate(update.created_at)}</p>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 tracking-tight mt-2">{update.title}</h4>
                      <p className="text-sm font-medium text-slate-500 line-clamp-2">{update.excerpt || 'Tidak ada kutipan singkat.'}</p>
                    </div>
                 </div>
               ))}
               {campaign.updates?.length === 0 && (
                 <div className="text-center py-12 text-slate-400 italic">Belum ada kabar penyaluran.</div>
               )}
               {campaign.updates?.length > 0 && (
                 <Pagination 
                   currentPage={updatePage}
                   totalPages={updateTotalPages}
                   totalCount={campaign.updates?.length || 0}
                   offset={(updatePage - 1) * updateLimit}
                   limit={updateLimit}
                   onPageChange={(p) => setUpdatePage(p)}
                 />
               )}
            </div>
          )}
        </div>
      </div>

      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={20} /></div>
                Tambah Kabar Penyaluran
              </h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
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
                <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)} className="rounded-xl font-bold bg-white px-6 py-5">Batal</Button>
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
