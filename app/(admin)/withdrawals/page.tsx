"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  Search, CheckCircle, XCircle, Clock, Wallet, History, ArrowUpRight, Loader2, X,
  Eye, Calendar, Hash, User, ShieldCheck, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Pagination } from '@/components/shared/pagination';
import { formatIDR } from '@/lib/format';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// formatIDR removed - using lib/format instead

export default function WithdrawalsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const { data: withdrawals, error, isLoading, mutate } = useSWR(
    `/api/withdrawals?limit=${limit}&offset=${offset}&search=${search}&status=${filterStatus}`, 
    fetcher
  );

  const totalCount = withdrawals?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);

  const handleOpenDetail = (w: any) => {
    setSelectedWithdrawal(w);
    setIsDetailOpen(true);
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const confirmMsg = status === 'PROCESSED' ? 'Tandai sudah dibayar? Saldo afiliasi akan otomatis berkurang.' : 'Batalkan penarikan ini?';
    
    toast(confirmMsg, {
      action: {
        label: 'Ya, Lanjutkan',
        onClick: async () => {
          try {
            const res = await fetch('/api/withdrawals', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, status }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            toast.success(`Pencairan dana berhasil ditandai sebagai ${status}`);
            mutate();
            setIsDetailOpen(false);
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-normal bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Permintaan Penarikan</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Kelola pencairan komisi afiliasi</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari affiliate..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-emerald-500/50" 
          />
        </div>
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto">
          {['ALL', 'PENDING', 'PROCESSED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={cn(
                "px-4 py-2 text-xs font-normal transition-all rounded-xl",
                filterStatus === s ? "bg-amber-600 text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-50"
              )}
            >
              {s === 'ALL' ? 'Semua' : s === 'PENDING' ? 'Pending' : s === 'PROCESSED' ? 'Berhasil' : 'Batal'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-normal">
                <th className="px-6 py-5 border-b border-slate-100 w-12 text-center">#</th>
                <th className="px-6 py-5 border-b border-slate-100">Tanggal</th>
                <th className="px-6 py-5 border-b border-slate-100">Afiliasi</th>
                <th className="px-6 py-5 border-b border-slate-100 text-right">Nominal</th>
                <th className="px-6 py-5 border-b border-slate-100 text-center">Status</th>
                <th className="px-6 py-5 border-b border-slate-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                [...Array(limit)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 px-6 py-5 bg-slate-50/20"></td></tr>)
              ) : withdrawals?.length > 0 ? (
                withdrawals.map((w: any, idx: number) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6 text-center text-xs font-normal text-slate-300">
                      {offset + idx + 1}
                    </td>
                    <td className="px-6 py-6 text-xs font-normal text-slate-400 whitespace-nowrap">
                      {new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="block text-[10px] text-slate-300">{new Date(w.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-800 tracking-tight text-sm">{w.affiliate_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{w.affiliate_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right font-normal text-slate-800 text-sm">{formatIDR(w.amount)}</td>
                    <td className="px-6 py-6 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-normal border shadow-sm",
                        w.status === 'PROCESSED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                        w.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-100" : 
                        "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {w.status === 'PROCESSED' ? 'Berhasil' : w.status === 'PENDING' ? 'Pending' : 'Batal'}
                      </span>
                    </td>
                    <td className="px-6 py-6 font-sans">
                      <div className="flex justify-center gap-2 transition-opacity">
                         <button onClick={() => handleOpenDetail(w)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                         {w.status === 'PENDING' && (
                           <>
                             <button onClick={() => handleUpdateStatus(w.id, 'PROCESSED')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm"><CheckCircle size={18} /></button>
                             <button onClick={() => handleUpdateStatus(w.id, 'CANCELLED')} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><XCircle size={18} /></button>
                           </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 italic font-semibold">Belum ada penarikan ditemukan.</td></tr>
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

      {/* Detail Modal */}
      {isDetailOpen && selectedWithdrawal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">Detail Pencairan Komisi</h2>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-8 text-left">
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                   <Wallet size={40} strokeWidth={1.5} />
                 </div>
                 <div className="text-left">
                   <h3 className="text-2xl font-normal text-slate-800 tracking-tight leading-tight">{selectedWithdrawal.affiliate_name}</h3>
                   <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">Kode: {selectedWithdrawal.affiliate_code}</span>
                       <span className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-medium uppercase tracking-widest border shadow-sm",
                        selectedWithdrawal.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-100" : 
                        selectedWithdrawal.status === 'PROCESSED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                        "bg-rose-50 text-rose-700 border-rose-100"
                      )}>{selectedWithdrawal.status}</span>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><ArrowUpRight size={12}/> Nominal pencairan</p>
                    <p className="text-2xl font-normal text-slate-800 tracking-tighter">{formatIDR(selectedWithdrawal.amount)}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><Calendar size={12}/> Diajukan pada</p>
                    <p className="text-sm font-normal text-slate-700">{new Date(selectedWithdrawal.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
               </div>

               <div className="bg-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-white/10 transition-colors">
                    <ShieldCheck size={120} strokeWidth={1} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-normal text-amber-400 mb-4">Informasi rekening bank</p>
                    <div className="text-xl font-normal text-white tracking-tight leading-relaxed mb-6 font-mono">
                      {selectedWithdrawal.bank_account_info}
                    </div>
                    <div className="flex gap-2">
                       <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border border-white/10">Verified Source</span>
                    </div>
                  </div>
               </div>

               {selectedWithdrawal.status === 'PROCESSED' && (
                 <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                       <CheckCircle size={20} />
                    </div>
                    <div>
                       <p className="text-xs font-normal text-emerald-800 uppercase tracking-widest">Berhasil Diproses</p>
                       <p className="text-[10px] font-normal text-emerald-600 uppercase">Pada {new Date(selectedWithdrawal.processed_at).toLocaleDateString()} {new Date(selectedWithdrawal.processed_at).toLocaleTimeString()}</p>
                    </div>
                 </div>
               )}

               <div className="flex gap-3 pt-2">
                  {selectedWithdrawal.status === 'PENDING' ? (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'CANCELLED')} className="flex-1 py-4 bg-white border border-rose-200 rounded-2xl text-xs font-normal text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-2 font-sans font-sans"><Ban size={16} /> Tolak</button>
                      <button onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'PROCESSED')} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-xs font-normal shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 font-sans"><CheckCircle size={16}/> Setujui & bayar</button>
                    </>
                  ) : (
                    <button onClick={() => setIsDetailOpen(false)} className="w-full py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-normal uppercase tracking-widest shadow-xl active:scale-95 transition-all font-sans">Tutup</button>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
