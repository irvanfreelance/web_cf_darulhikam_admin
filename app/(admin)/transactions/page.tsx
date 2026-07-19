"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  Search, Filter, Download,
  CheckCircle, Trash2, Eye, X, Users, Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { toast } from 'sonner';
import { Pagination } from '@/components/shared/pagination';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ─── Default / initial filter values ───────────────────────────────────────
const DEFAULT_FILTERS = {
  startDate:  '2026-01-01',
  endDate:    '2026-12-31',
  minAmount:  '',
  maxAmount:  '',
  campaignId: '' as string | number,
  status:     'ALL',
  search:     '',
  affiliateId: '' as string | number,
  paymentMethodId: '' as string | number,
};

const TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'transactions', label: 'Donations' },
];

type Filters = typeof DEFAULT_FILTERS;

// ─── Page Component ─────────────────────────────────────────────────────────
export default function TransactionsPage() {
  // draft  = values user is currently editing inside the filter panel
  const [draft,   setDraft]   = useState<Filters>({ ...DEFAULT_FILTERS });
  const [activeTab, setActiveTab] = useState('invoices');
  // applied = values that actually drive the SWR query (committed on button click)
  const [applied, setApplied] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);

  const [page,  setPage]  = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Lightweight campaign list for the dropdown
  const { data: campaignOptions } = useSWR<{ id: number; title: string }[]>(
    '/api/campaigns?minimal=true&status=ACTIVE',
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: affiliateOptions } = useSWR<{ id: number; name: string }[]>(
    '/api/affiliates?limit=1000',
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: paymentMethods } = useSWR<any[]>(
    '/api/payment-methods',
    fetcher,
    { revalidateOnFocus: false }
  );

  // How many applied filters deviate from the default
  const activeFilterCount = [
    applied.startDate  !== DEFAULT_FILTERS.startDate,
    applied.endDate    !== DEFAULT_FILTERS.endDate,
    applied.minAmount  !== '',
    applied.maxAmount  !== '',
    applied.campaignId !== '',
    applied.status     !== 'ALL',
    applied.search     !== '',
    applied.affiliateId !== '',
  ].filter(Boolean).length;

  const queryParams = new URLSearchParams({
    limit:     limit.toString(),
    offset:    offset.toString(),
    status:    applied.status,
    search:    applied.search,
    startDate: new Date(applied.startDate).toISOString(),
    endDate:   new Date(applied.endDate).toISOString(),
    ...(applied.minAmount  && { minAmount:  String(applied.minAmount)  }),
    ...(applied.maxAmount  && { maxAmount:  String(applied.maxAmount)  }),
    ...(applied.campaignId && { campaignId: String(applied.campaignId) }),
    ...(applied.affiliateId && { affiliateId: String(applied.affiliateId) }),
    type: activeTab,
  });

  const { data: transactions, error, isLoading, mutate } = useSWR(
    `/api/transactions?${queryParams.toString()}`,
    fetcher
  );

  const totalCount = transactions?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  if (error) return (
    <div className="p-8 text-rose-500 font-semibold bg-rose-50 rounded-2xl border border-rose-100 italic">
      Error: {error.message}
    </div>
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const handleResetFilters = () => {
    const clean = { ...DEFAULT_FILTERS };
    setDraft(clean);
    setApplied(clean);
    setPage(1);
  };

  const removeChip = (key: keyof Filters, defaultVal: string | number) => {
    setApplied(a => ({ ...a, [key]: defaultVal }));
    setDraft(d => ({ ...d, [key]: defaultVal }));
    setPage(1);
  };

  const handleUpdateStatus = async (id: number, created_at: string, newStatus: string) => {
    toast(`Ubah status ke ${newStatus}?`, {
      action: {
        label: 'Update',
        onClick: async () => {
          try {
            const res = await fetch('/api/transactions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, created_at, status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            toast.success('Status transaksi diperbarui');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  const handleDelete = async (id: number, created_at: string) => {
    toast('Hapus transaksi ini? Data tidak dapat dikembalikan.', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(
              `/api/transactions?id=${id}&created_at=${created_at}`,
              { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Transaksi dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      toast.loading('Mempersiapkan data export...');
      // Fetch all filtered data by using a large limit
      const exportParams = new URLSearchParams(queryParams);
      exportParams.set('limit', '5000');
      exportParams.set('offset', '0');

      const res = await fetch(`/api/transactions?${exportParams.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil data export');
      const data = await res.json();

      if (!data || data.length === 0) {
        toast.error('Tidak ada data untuk diexport');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data.map((item: any) => {
        if (activeTab === 'invoices') {
          return {
            'Kode Invoice': item.invoice_code,
            'Waktu': formatDate(item.created_at),
            'Donatur': item.donor_name_snapshot,
            'Nominal': item.total_amount,
            'Metode Pembayaran': item.payment_method,
            'Status': item.status,
            'Kampanye': item.campaigns?.map((c: any) => c.title).join(', ')
          };
        } else {
          return {
            'Invoice': item.invoice_code,
            'Waktu': formatDate(item.created_at),
            'Donatur': item.donor_name_snapshot,
            'Nominal': item.amount,
            'Kampanye': item.campaign_title,
            'Affiliate': item.affiliate_name || '-',
            'Affiliate Code': item.affiliate_code || '-',
            'Komisi': item.affiliate_commission,
            'Status': item.status
          };
        }
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'invoices' ? 'Invoices' : 'Donations');
      
      const fileName = `Export_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.dismiss();
      toast.success('Data berhasil diexport');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Laporan ledger &amp; donasi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-normal transition-all shadow-sm border relative",
              isFilterOpen
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
            )}
          >
            <Filter size={18} />
            {isFilterOpen ? 'Tutup Filter' : 'Advanced Filter'}
            {/* Badge: active filter count */}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-normal text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={cn(
              "px-8 py-4 text-sm font-medium transition-all relative border-b-2",
              activeTab === tab.id 
                ? "text-indigo-600 border-indigo-500 bg-indigo-50/30" 
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* ── Quick Filter Bar ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] group text-left">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Cari invoice atau donatur..."
            value={draft.search}
            onChange={(e) => {
              setDraft(d => ({ ...d, search: e.target.value }));
              // Auto-apply search for better UX
              setApplied(a => ({ ...a, search: e.target.value }));
              setPage(1);
            }}
            className="pl-10 h-10 w-full bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48 text-left">
            <SearchableSelect
              value={draft.status}
              onChange={(val) => {
                setDraft(d => ({ ...d, status: String(val) }));
                setApplied(a => ({ ...a, status: String(val) }));
                setPage(1);
              }}
              options={[
                { id: 'ALL', name: 'Semua Status' },
                { id: 'PAID', name: 'Lunas' },
                { id: 'PENDING', name: 'Pending' },
                { id: 'EXPIRED', name: 'Kedaluwarsa' },
                { id: 'CANCELLED', name: 'Batal' }
              ]}
              className="h-10"
            />
          </div>

          <div className="w-full sm:w-64 text-left">
            <SearchableSelect
              value={draft.affiliateId}
              onChange={(val) => {
                setDraft(d => ({ ...d, affiliateId: val }));
                setApplied(a => ({ ...a, affiliateId: val }));
                setPage(1);
              }}
              placeholder="Semua Affiliate"
              options={[
                { id: '', name: 'Semua Affiliate' },
                ...(Array.isArray(affiliateOptions) ? affiliateOptions : []).map((a: any) => ({ id: a.id, name: a.name }))
              ]}
              className="h-10"
            />
          </div>

          {activeTab === 'invoices' && (
            <div className="w-full sm:w-48 text-left">
              <SearchableSelect
                value={draft.paymentMethodId}
                onChange={(val) => {
                  setDraft(d => ({ ...d, paymentMethodId: String(val) }));
                  setApplied(a => ({ ...a, paymentMethodId: String(val) }));
                  setPage(1);
                }}
                placeholder="Semua Metode"
                options={[
                  { id: '', name: 'Semua Metode' },
                  ...(Array.isArray(paymentMethods) ? paymentMethods : []).map((pm: any) => ({ id: pm.id, name: pm.name }))
                ]}
                className="h-10"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Advanced Filter Panel ── */}
      {isFilterOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible animate-in slide-in-from-top-2 duration-300">

          {/* Panel header */}
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 tracking-tight">Advanced Filter</p>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {activeFilterCount} filter aktif
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">

            {/* Row 1 — Date range + amount */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Tanggal Mulai</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft(d => ({ ...d, startDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Tanggal Akhir</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => setDraft(d => ({ ...d, endDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Min. Nominal</label>
                <input
                  type="number"
                  placeholder="0"
                  value={draft.minAmount}
                  onChange={(e) => setDraft(d => ({ ...d, minAmount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Max. Nominal</label>
                <input
                  type="number"
                  placeholder="Tak terbatas"
                  value={draft.maxAmount}
                  onChange={(e) => setDraft(d => ({ ...d, maxAmount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Row 2 — Status + Campaign + Search text */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft(d => ({ ...d, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all h-12 appearance-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PAID">Lunas</option>
                  <option value="PENDING">Pending</option>
                  <option value="EXPIRED">Kedaluwarsa</option>
                  <option value="CANCELLED">Dibatalkan</option>
                </select>
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Kampanye</label>
                <SearchableSelect
                  value={draft.campaignId}
                  onChange={(val) => setDraft(d => ({ ...d, campaignId: val }))}
                  placeholder="Semua Kampanye"
                  options={[
                    { id: '', name: 'Semua Kampanye' },
                    ...(campaignOptions ?? []).map((c) => ({ id: c.id, name: c.title }))
                  ]}
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Affiliate</label>
                <SearchableSelect
                  value={draft.affiliateId}
                  onChange={(val) => setDraft(d => ({ ...d, affiliateId: val }))}
                  placeholder="Semua Affiliate"
                  options={[
                    { id: '', name: 'Semua Affiliate' },
                    ...(Array.isArray(affiliateOptions) ? affiliateOptions : []).map((a: any) => ({ id: a.id, name: a.name }))
                  ]}
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Pencarian</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nomor invoice atau donatur..."
                    value={draft.search}
                    onChange={(e) => setDraft(d => ({ ...d, search: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all h-12"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={14} /> Reset Semua Filter
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-indigo-500/20 shadow-md"
              >
                <Search size={15} /> Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Filter Chips (visible when panel is closed) ── */}
      {!isFilterOpen && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filter aktif:</span>

          {applied.status !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
              Status: {applied.status}
              <button onClick={() => removeChip('status', 'ALL')}><X size={11} /></button>
            </span>
          )}
          {applied.campaignId && (
            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-100">
              Kampanye: {(campaignOptions ?? []).find(c => String(c.id) === String(applied.campaignId))?.title ?? applied.campaignId}
              <button onClick={() => removeChip('campaignId', '')}><X size={11} /></button>
            </span>
          )}
          {applied.minAmount && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">
              Min: {formatIDR(Number(applied.minAmount))}
              <button onClick={() => removeChip('minAmount', '')}><X size={11} /></button>
            </span>
          )}
          {applied.maxAmount && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">
              Max: {formatIDR(Number(applied.maxAmount))}
              <button onClick={() => removeChip('maxAmount', '')}><X size={11} /></button>
            </span>
          )}
          {applied.search && (
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
              Cari: &quot;{applied.search}&quot;
              <button onClick={() => removeChip('search', '')}><X size={11} /></button>
            </span>
          )}
          {applied.affiliateId && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
              Affiliate: {(Array.isArray(affiliateOptions) ? affiliateOptions : []).find((a: any) => String(a.id) === String(applied.affiliateId))?.name ?? applied.affiliateId}
              <button onClick={() => removeChip('affiliateId', '')}><X size={11} /></button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors ml-1"
          >
            Hapus semua
          </button>
        </div>
      )}

      {/* ── Transactions Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-semibold">
                <th className="px-6 py-4 border-b border-slate-100 font-normal w-12 text-center">#</th>
                <th className="px-6 py-4 border-b border-slate-100 font-bold">Waktu &amp; Kode</th>
                <th className="px-6 py-4 border-b border-slate-100 font-bold">Donatur</th>
                <th className="px-6 py-4 border-b border-slate-100 font-normal">Nominal</th>
                {activeTab === 'invoices' && <th className="px-6 py-4 border-b border-slate-100 font-bold text-center">Metode</th>}
                <th className="px-6 py-4 border-b border-slate-100 font-bold">{activeTab === 'invoices' ? 'Kampanye' : 'Kampanye'}</th>
                {activeTab === 'transactions' && <th className="px-6 py-4 border-b border-slate-100 font-bold">Affiliate</th>}
                <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(limit)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="h-16 px-6 py-4" />
                  </tr>
                ))
              ) : transactions?.length > 0 ? (
                transactions.map((trx: any, idx: number) => (
                  <tr
                    key={trx.id}
                    onMouseEnter={() => activeTab === 'invoices' && router.prefetch(`/transactions/${trx.invoice_code}`)}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-5 border-b border-slate-50 text-center text-sm font-normal text-slate-400 bg-slate-50/20">
                      {offset + idx + 1}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-normal text-slate-800">{trx.invoice_code}</span>
                        <span className="text-xs text-slate-400 font-normal mt-1 tracking-tight">{formatDate(trx.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-normal text-slate-800 text-base text-left">{trx.donor_name_snapshot}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="font-normal text-slate-800 text-base tracking-tight">
                        {activeTab === 'invoices' ? formatIDR(trx.total_amount) : formatIDR(trx.amount)}
                      </p>
                      {activeTab === 'transactions' && trx.affiliate_commission > 0 && (
                        <p className="text-xs text-emerald-600 font-normal">Comm: {formatIDR(trx.affiliate_commission)}</p>
                      )}
                    </td>
                    {activeTab === 'invoices' && (
                      <td className="px-6 py-5 text-center">
                        {trx.payment_method_logo ? (
                          <img 
                            src={trx.payment_method_logo} 
                            alt={trx.payment_method} 
                            className="h-6 w-auto mx-auto object-contain"
                            title={trx.payment_method}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal uppercase tracking-tighter line-clamp-1">{trx.payment_method}</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <div className="flex flex-col text-left">
                        {activeTab === 'invoices' ? (
                          <span className="text-sm text-slate-600 mt-1 line-clamp-1 font-normal">
                            {trx.campaigns?.map((c: any) => c.title).join(', ') || 'No campaign'}
                          </span>
                        ) : (
                          <span className="text-sm font-normal text-slate-800 line-clamp-1">{trx.campaign_title}</span>
                        )}
                      </div>
                    </td>
                    {activeTab === 'transactions' && (
                      <td className="px-6 py-5">
                        {trx.affiliate_name ? (
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-normal text-indigo-600">{trx.affiliate_name}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{trx.affiliate_code}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-normal border shadow-sm",
                        trx.status === 'PAID'      ? "bg-teal-50 text-teal-700 border-teal-100"   :
                        trx.status === 'PENDING'   ? "bg-amber-50 text-amber-700 border-amber-100" :
                        trx.status === 'EXPIRED'   ? "bg-slate-50 text-slate-400 border-slate-100" :
                                                     "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {trx.status === 'PAID' ? 'Lunas' : trx.status === 'PENDING' ? 'Pending' : trx.status === 'EXPIRED' ? 'Kedaluwarsa' : 'Batal'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-1">
                        {activeTab === 'invoices' ? (
                          <>
                            <button onClick={() => handleUpdateStatus(trx.id, trx.created_at, 'PAID')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Mark as Paid">
                              <CheckCircle size={18} />
                            </button>
                            {trx.proof_transfer && (
                              <button onClick={() => setProofImageUrl(trx.proof_transfer)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Lihat Bukti Transfer">
                                <ImageIcon size={18} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(trx.id, trx.created_at)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                            <button onClick={() => router.push(`/transactions/${trx.invoice_code}`)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="Detail Transaksi">
                              <Eye size={18} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => router.push(`/transactions/${trx.invoice_code}`)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="Detail Transaksi">
                            <Eye size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">No transactions found.</td>
                </tr>
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

      {/* ── Proof of Transfer Modal ── */}
      {proofImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setProofImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 transition-colors bg-black/40 p-2 rounded-full"
            >
              <X size={24} />
            </button>
            <h3 className="font-bold text-lg mb-4 text-slate-800">Bukti Transfer</h3>
            <div className="relative w-full aspect-auto min-h-[300px] flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <img 
                src={proofImageUrl} 
                alt="Bukti Transfer" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
