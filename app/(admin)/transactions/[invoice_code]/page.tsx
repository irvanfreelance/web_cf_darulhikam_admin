"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, ArrowUpRight, CheckCircle2, Clock, 
  User, Users, Mail, Phone, MapPin, Search, Receipt,
  Bell, Activity, MessageSquare, List,
  CreditCard, ShieldCheck, AlertCircle, Megaphone
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

function LogDetailCard({ log, title, subtitle, status, statusColor, bgColor, borderColor }: any) {
  const [expanded, setExpanded] = useState(false);

  const formatJson = (str: string) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); }
    catch(e) { return str; }
  };

  return (
    <div 
      className={cn("p-3 rounded-xl border text-sm transition-all cursor-pointer hover:shadow-md", bgColor, borderColor)}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-slate-800 text-xs">{title}</span>
        {status && (
          <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded", statusColor)}>
            {status}
          </span>
        )}
      </div>
      <div className="text-slate-600 text-xs mb-1">{subtitle}</div>
      <p className="mt-2 text-[10px] text-slate-400">{formatDate(log.created_at)}</p>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2 cursor-text" onClick={e => e.stopPropagation()}>
          {log.request_payload && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Request Payload</span>
              <pre className="text-[10px] bg-slate-800 text-slate-200 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                {formatJson(log.request_payload)}
              </pre>
            </div>
          )}
          {log.response_payload && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Response Payload</span>
              <pre className="text-[10px] bg-slate-800 text-slate-200 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                {formatJson(log.response_payload)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TransactionDetailPage() {
  const { invoice_code } = useParams();
  const router = useRouter();
  
  const { data: trx, error, isLoading } = useSWR(`/api/transactions/${invoice_code}`, fetcher);

  if (isLoading) return <div className="p-8 animate-pulse space-y-8">
    <div className="h-12 w-1/3 bg-slate-100 rounded-2xl"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>;

  if (error || !trx) return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl">Error loading transaction detail</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-2 font-medium text-sm transition-colors">
            <ChevronLeft size={16} /> Kembali ke Transaksi
          </button>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{trx.invoice_code}</h1>
             <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                trx.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                trx.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                "bg-rose-50 text-rose-600 border-rose-100"
             )}>
                {trx.status}
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
         {/* Main Summary Panel */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Receipt size={16} className="text-indigo-500" /> Detail Invoice</h3>
               <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                     <p className="text-slate-400 font-medium">Nominal Donasi</p>
                     <p className="font-bold text-lg text-slate-800">{formatIDR(trx.base_amount)}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-slate-400 font-medium">Admin Fee</p>
                     <p className="font-bold text-lg text-slate-800">{formatIDR(trx.admin_fee)}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-slate-400 font-medium">Unique Code</p>
                     <p className="font-bold text-lg text-slate-800">{trx.unique_code > 0 ? `+${trx.unique_code}` : '-'}</p>
                  </div>
                  <div className="space-y-1 col-span-2 p-4 bg-slate-50 rounded-xl mt-2 flex justify-between items-center">
                     <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">TOTAL TAGIHAN</p>
                     <p className="font-black text-2xl text-indigo-600">{formatIDR(trx.total_amount)}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                  <div className="space-y-1">
                     <p className="text-slate-400 font-medium text-xs">Kampanye Tujuan</p>
                     <p className="font-bold text-slate-800 text-sm mt-1">{trx.campaign_title || '-'}</p>
                     {trx.variant_name && <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">{trx.variant_name} (Qty: {trx.transaction_qty})</p>}
                  </div>
                  <div className="space-y-1">
                     <p className="text-slate-400 font-medium text-xs">Metode Pembayaran</p>
                     <div className="flex items-center gap-2 mt-1">
                        <CreditCard size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-800 text-sm">{trx.payment_method_name || 'Tidak diketahui'} <span className="text-xs font-normal text-slate-400">({trx.payment_method_type})</span></span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Qurban Sub-items (if any) */}
            {trx.qurban_names && trx.qurban_names.length > 0 && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Users size={16} className="text-emerald-500" /> Daftar Nama Qurban (Mudhohi)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {trx.qurban_names.map((q: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                           <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                           <span className="text-sm font-semibold text-slate-800">{q.mudhohi_name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Sidebar Timeline & Context */}
         <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><User size={16} className="text-teal-500" /> Profil Donatur</h3>
               <div className="space-y-4">
                  <div className="flex items-start gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0">{trx.donor_name_snapshot?.charAt(0) || '?'}</div>
                     <div>
                        <p className="font-bold text-sm text-slate-800">{trx.donor_name_snapshot}</p>
                        {trx.is_anonymous && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">Hamba Allah (Anonim)</span>}
                     </div>
                  </div>
                  {trx.donor_email && (
                     <div className="flex items-center gap-2 text-sm text-slate-500 pt-2"><Mail size={14} className="text-slate-400" /> {trx.donor_email}</div>
                  )}
                  {trx.donor_phone && (
                     <div className="flex items-center gap-2 text-sm text-slate-500"><Phone size={14} className="text-slate-400" /> {trx.donor_phone}</div>
                  )}
               </div>

               {trx.doa && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                     <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MessageSquare size={12} className="text-indigo-400" /> Doa / Pesan Donatur
                     </h4>
                     <p className="text-sm text-slate-700 italic bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                        "{trx.doa}"
                     </p>
                  </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Clock size={16} className="text-slate-400" /> Timeline Transaksi</h3>
               <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                     <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-slate-100 shadow-sm bg-white">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                           <div className="font-bold text-slate-800 text-xs">Invoice Dibuat</div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{formatDate(trx.created_at)}</div>
                     </div>
                  </div>
                  {trx.paid_at && (
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-emerald-100 shadow-sm bg-emerald-50">
                           <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-emerald-800 text-xs">Berhasil Dibayar</div>
                           </div>
                           <div className="text-[10px] text-emerald-600 font-medium">{formatDate(trx.paid_at)}</div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* Observability Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
         {/* Payment Logs */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
               <ShieldCheck size={16} className="text-slate-400" /> Payment Gateway Logs
            </h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
               {trx.payment_logs?.length > 0 ? trx.payment_logs.map((log: any) => (
                  <LogDetailCard 
                    key={log.id} 
                    log={log}
                    title={log.endpoint}
                    subtitle={`Tipe: ${log.type || 'Callback'}`}
                    status={log.http_status}
                    statusColor="bg-slate-200 text-slate-800"
                    bgColor="bg-slate-50/50"
                    borderColor="border-slate-100"
                  />
               )) : <div className="text-slate-400 italic text-sm text-center py-8">Tidak ada log server to server.</div>}
            </div>
         </div>

         {/* Notification Logs */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
               <Bell size={16} className="text-orange-400" /> Push Notifications
            </h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
               {trx.notification_logs?.length > 0 ? trx.notification_logs.map((log: any) => {
                  let payload = { message: '' };
                  try { payload = JSON.parse(log.request_payload); } catch(e) {}
                  return (
                    <LogDetailCard 
                      key={log.id} 
                      log={log}
                      title={`${log.channel} • ${log.recipient}`}
                      subtitle={<span className="line-clamp-2">{payload.message || 'Pesan dikirim...'}</span>}
                      status={log.status}
                      statusColor={log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}
                      bgColor="bg-orange-50/30"
                      borderColor="border-orange-100/50"
                    />
                  );
               }) : <div className="text-slate-400 italic text-sm text-center py-8">Tidak ada log notifikasi terekam.</div>}
            </div>
         </div>

         {/* Ads Conversion Logs */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
               <Megaphone size={16} className="text-pink-500" /> Ads Conversion Logs
            </h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
               {trx.ads_conversion_logs?.length > 0 ? trx.ads_conversion_logs.map((log: any) => (
                  <LogDetailCard 
                    key={log.id} 
                    log={log}
                    title={log.platform}
                    subtitle={<span className="font-medium text-pink-600 mb-1">{log.event_name}</span>}
                    status={log.http_status || 'ERR'}
                    statusColor={log.http_status >= 200 && log.http_status < 300 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}
                    bgColor="bg-pink-50/30"
                    borderColor="border-pink-100/50"
                  />
               )) : <div className="text-slate-400 italic text-sm text-center py-8">Tidak ada log konversi ads.</div>}
            </div>
         </div>
      </div>
    </div>
  );
}
