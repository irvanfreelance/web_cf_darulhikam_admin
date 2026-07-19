"use client";

import React from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, User, Mail, Phone, Calendar,
  Receipt, Activity, ArrowUpRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatIDR } from '@/lib/format';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

export default function DonorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const { data: donor, error, isLoading } = useSWR(`/api/donors/${id}`, fetcher);

  if (isLoading) return <div className="p-8 animate-pulse space-y-8">
    <div className="h-12 w-1/3 bg-slate-100 rounded-2xl"></div>
    <div className="h-64 bg-slate-100 rounded-2xl"></div>
  </div>;

  if (error || !donor) return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl">Error loading donor detail</div>;

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-2 font-medium text-sm transition-colors">
            <ChevronLeft size={16} /> Kembali ke Donatur
          </button>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Detail Profil Donatur</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Identity Card */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
               <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-3xl mb-4 shadow-inner">
                  {donor.name?.charAt(0) || '?'}
               </div>
               <h2 className="text-xl font-bold text-slate-800 tracking-tight">{donor.name}</h2>
               
               <div className="w-full space-y-3 mt-6 text-left">
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                     <Mail size={16} className="text-slate-400" /> <span className="truncate">{donor.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                     <Phone size={16} className="text-slate-400" /> {donor.phone || '-'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                     <Calendar size={16} className="text-slate-400" /> Terdaftar {donor.created_at ? new Date(donor.created_at).getFullYear() : '-'}
                  </div>
               </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white text-center">
               <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest shadow-none">Total Donasi Tervalidasi</span>
               <p className="text-3xl font-black mt-2 drop-shadow-sm">{formatIDR(donor.stats?.total_donated)}</p>
               <div className="flex justify-between items-center text-xs mt-4 pt-4 border-t border-white/20 font-medium">
                 <span>{donor.stats?.total_invoices} Invoices Detail</span>
                 <span>{donor.stats?.paid_invoices} Sukses</span>
               </div>
            </div>
         </div>

         {/* Historical Data */}
         <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt size={18} className="text-indigo-500" /> Riwayat Partisipasi (Invoices)</h3>
            </div>
            <div className="overflow-x-auto flex-1">
               <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <th className="px-6 py-4">Kode Invoice</th>
                       <th className="px-6 py-4">Kampanye</th>
                       <th className="px-6 py-4">Waktu</th>
                       <th className="px-6 py-4 text-right">Nominal</th>
                       <th className="px-6 py-4 text-center">Status</th>
                       <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {donor.invoices?.length > 0 ? donor.invoices.map((inv: any) => (
                       <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-slate-700 text-sm">{inv.invoice_code}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600 line-clamp-1">{inv.campaign_title || '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatDate(inv.created_at)}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">{formatIDR(inv.total_amount)}</td>
                          <td className="px-6 py-4 text-center">
                             <span className={cn(
                               "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                               inv.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                               inv.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                               "bg-rose-50 text-rose-600 border-rose-100"
                             )}>{inv.status}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button onClick={() => router.push(`/transactions/${inv.invoice_code}`)} className="p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all" title="Lihat Detail Transaksi">
                                <ArrowUpRight size={18} />
                             </button>
                          </td>
                       </tr>
                    )) : (
                       <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada riwayat transaksi</td></tr>
                    )}
                 </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
