"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft, Edit, Save, Loader2, X, Plus, Trash2,
  Users, Calendar, Percent,
  Banknote, AlertCircle, CheckCircle, Clock,
  TrendingUp, Wallet, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────
interface Affiliate {
  id: number;
  affiliate_code: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  balance?: number;
  created_at: string;
  converted_donors?: number;
  raised_amount?: number;
}

interface Commission {
  affiliate_id: number;
  campaign_id: number;
  campaign_title: string;
  campaign_slug: string;
  campaign_status: string;
  commission_type: 'PERCENTAGE' | 'AMOUNT';
  commission_value: number;
  click_count: number;
  converted_donors: number;
  raised_amount: number;
  commission_earned: number;
}

interface Withdrawal {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  affiliate_code: string;
  amount: number;
  bank_account_info: string;
  status: string;
  created_at: string;
  processed_at?: string;
  total_count?: number;
}

type TabId = 'commissions' | 'transactions' | 'withdrawals';

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  });

function WithdrawalStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={11} /> },
    PROCESSED: { label: 'Diproses', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle size={11} /> },
    REJECTED:  { label: 'Ditolak',  cls: 'bg-rose-50 text-rose-700 border-rose-200',           icon: <X size={11} /> },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-700 border-slate-200', icon: null };
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border', cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function AffiliateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const affiliateId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('commissions');

  // ── Affiliate data ─────────────────────────────────────────────────────
  const {
    data: affiliateRow,
    isLoading: affLoading,
    error: affError,
  } = useSWR<Affiliate>(
    `/api/affiliates/${affiliateId}`,
    fetcher
  );

  // ── Commissions ────────────────────────────────────────────────────────
  const [cPage, setCPage] = useState(1);
  const [cLimit, setCLimit] = useState(10);
  const cOffset = (cPage - 1) * cLimit;

  const {
    data: commissions,
    isLoading: commissionsLoading,
    mutate: mutateCommissions,
  } = useSWR<Commission[]>(
    `/api/affiliate-commissions?affiliate_id=${affiliateId}&limit=${cLimit}&offset=${cOffset}`,
    fetcher
  );

  const { data: allCampaigns } = useSWR<any[]>(
    '/api/campaigns?limit=500&offset=0',
    fetcher
  );

  const [editingComm, setEditingComm] = useState<Commission | null>(null);
  const [commForm, setCommForm] = useState({
    campaign_id: '' as number | '',
    commission_type: 'PERCENTAGE' as 'PERCENTAGE' | 'AMOUNT',
    commission_value: '',
  });
  const [commSubmitting, setCommSubmitting] = useState(false);

  const assignedCampaignIds = new Set(commissions?.map((c) => c.campaign_id) ?? []);
  const availableCampaigns = (allCampaigns ?? [])
    .filter((c: any) => editingComm || !assignedCampaignIds.has(c.id))
    .map((c: any) => ({ id: c.id, name: c.title }));

  const handleEditComm = (c: Commission) => {
    setEditingComm(c);
    setCommForm({
      campaign_id: c.campaign_id,
      commission_type: c.commission_type,
      commission_value: String(c.commission_value),
    });
  };

  const handleCancelEditComm = () => {
    setEditingComm(null);
    setCommForm({ campaign_id: '', commission_type: 'PERCENTAGE', commission_value: '' });
  };

  const handleCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.campaign_id) {
      toast.error('Pilih kampanye terlebih dahulu');
      return;
    }
    setCommSubmitting(true);
    try {
      const method = editingComm ? 'PATCH' : 'POST';
      const body = {
        affiliate_id: Number(affiliateId),
        campaign_id: Number(commForm.campaign_id),
        commission_type: commForm.commission_type,
        commission_value: Number(commForm.commission_value),
      };
      const res = await fetch('/api/affiliate-commissions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan komisi');
      }
      toast.success(editingComm ? 'Komisi diperbarui' : 'Komisi ditambahkan');
      mutateCommissions();
      handleCancelEditComm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCommSubmitting(false);
    }
  };

  const handleDeleteComm = (c: Commission) => {
    toast('Hapus komisi ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(
              `/api/affiliate-commissions?affiliate_id=${c.affiliate_id}&campaign_id=${c.campaign_id}`,
              { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Gagal menghapus komisi');
            toast.success('Komisi dihapus');
            mutateCommissions();
          } catch (err: any) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  // ── Withdrawals ────────────────────────────────────────────────────────
  const [wPage, setWPage] = useState(1);
  const [wLimit, setWLimit] = useState(10);
  const wOffset = (wPage - 1) * wLimit;

  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
    mutate: mutateWithdrawals,
  } = useSWR<Withdrawal[]>(
    `/api/withdrawals?affiliate_id=${affiliateId}&limit=${wLimit}&offset=${wOffset}`,
    fetcher
  );

  const wTotalCount: number = (withdrawals as any)?.[0]?.total_count ?? 0;
  const wTotalPages = Math.ceil(wTotalCount / wLimit);

  const handleWithdrawalStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal update status');
      }
      toast.success(`Status diubah ke ${status}`);
      mutateWithdrawals();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteWithdrawal = (id: number) => {
    toast('Hapus withdrawal ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/withdrawals?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus');
            toast.success('Withdrawal dihapus');
            mutateWithdrawals();
          } catch (err: any) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  const withdrawalColumns = [
    {
      header: '#',
      headerClassName: 'w-12 text-center',
      className: 'text-center text-xs text-slate-400',
      cell: (_: any, idx: number) => wOffset + idx + 1,
    },
    {
      header: 'Rekening / Keterangan',
      cell: (w: Withdrawal) => (
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-800 text-sm truncate max-w-[280px]">{w.bank_account_info}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {new Date(w.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Jumlah',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (w: Withdrawal) => (
        <span className="font-bold text-slate-800">{formatIDR(w.amount)}</span>
      ),
    },
    {
      header: 'Status',
      className: 'text-center',
      cell: (w: Withdrawal) => <WithdrawalStatusBadge status={w.status} />,
    },
    {
      header: 'Aksi',
      className: 'text-center',
      cell: (w: Withdrawal) => (
        <div className="flex justify-center gap-1">
          {w.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleWithdrawalStatus(w.id, 'PROCESSED')}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
              >
                Proses
              </button>
              <button
                onClick={() => handleWithdrawalStatus(w.id, 'REJECTED')}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
              >
                Tolak
              </button>
            </>
          )}
          <button
            onClick={() => handleDeleteWithdrawal(w.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // ── Transactions ────────────────────────────────────────────────────────
  const [tPage, setTPage] = useState(1);
  const [tLimit, setTLimit] = useState(10);
  const tOffset = (tPage - 1) * tLimit;

  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useSWR<any[]>(
    activeTab === 'transactions' 
      ? `/api/transactions?type=transactions&affiliateId=${affiliateId}&limit=${tLimit}&offset=${tOffset}` 
      : null,
    fetcher
  );

  const tTotalCount = (transactions as any)?.[0]?.total_count ?? 0;
  const tTotalPages = Math.ceil(tTotalCount / tLimit);

  const transactionColumns = [
    {
      header: '#',
      headerClassName: 'w-12 text-center',
      className: 'text-center text-xs text-slate-400',
      cell: (_: any, idx: number) => tOffset + idx + 1,
    },
    {
      header: 'Waktu & Kode',
      cell: (t: any) => (
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-800 text-sm">{t.invoice_code}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Donatur',
      cell: (t: any) => (
        <span className="font-medium text-slate-700 text-sm">{t.donor_name_snapshot}</span>
      ),
    },
    {
      header: 'Kampanye',
      cell: (t: any) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-[200px]">{t.campaign_title}</span>
      ),
    },
    {
      header: 'Nominal',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (t: any) => (
        <span className="font-bold text-slate-800">{formatIDR(t.amount)}</span>
      ),
    },
    {
      header: 'Komisi',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (t: any) => (
        <span className="font-bold text-emerald-600">{formatIDR(t.affiliate_commission)}</span>
      ),
    },
    {
      header: 'Status',
      className: 'text-center',
      cell: (t: any) => (
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm",
          t.status === 'PAID' ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-amber-50 text-amber-700 border-amber-100"
        )}>
          {t.status === 'PAID' ? 'Lunas' : 'Pending'}
        </span>
      ),
    },
  ];

  // ── Error state ────────────────────────────────────────────────────────
  if (affError) {
    return (
      <div className="p-8 text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
        <AlertCircle size={20} />
        <span className="font-medium">Affiliate tidak ditemukan atau terjadi kesalahan.</span>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'commissions', label: 'Komisi Kampanye', icon: <Percent size={15} /> },
    { id: 'transactions', label: 'Data Transaksi', icon: <Receipt size={15} /> },
    { id: 'withdrawals', label: 'Riwayat Withdrawal', icon: <Wallet size={15} /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <PageHeader
        title={affiliateRow ? affiliateRow.name : 'Detail Afiliasi'}
        description={
          affiliateRow
            ? `Kode: ${affiliateRow.affiliate_code} · ${affiliateRow.email}`
            : affLoading ? 'Memuat...' : ''
        }
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      </PageHeader>

      {/* ── Stats row ── */}
      {affLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : affiliateRow ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users size={15} className="text-indigo-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Donatur</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{affiliateRow.converted_donors ?? 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={15} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Raised</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">{formatIDR(affiliateRow.raised_amount ?? 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <Wallet size={15} className="text-teal-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo</span>
            </div>
            <p className="text-lg font-bold text-teal-600">{formatIDR(affiliateRow.balance ?? 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <Calendar size={15} className="text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bergabung</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {new Date(affiliateRow.created_at).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Tabs card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600 bg-white'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/70'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'commissions' && commissions && commissions.length > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {commissions.length}
                </span>
              )}
              {tab.id === 'transactions' && tTotalCount > 0 && (
                <span className="ml-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tTotalCount}
                </span>
              )}
              {tab.id === 'withdrawals' && wTotalCount > 0 && (
                <span className="ml-1 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {wTotalCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Commissions ── */}
        {activeTab === 'commissions' && (
          <div className="p-6 space-y-6">
            {/* Form */}
            <form
              onSubmit={handleCommSubmit}
              className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {editingComm ? `Edit komisi: ${editingComm.campaign_title}` : 'Tambah komisi baru'}
                </p>
                {editingComm && (
                  <button
                    type="button"
                    onClick={handleCancelEditComm}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5 transition-all bg-white"
                  >
                    <X size={12} /> Batal edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">Kampanye</label>
                  {editingComm ? (
                    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-medium truncate">
                      {editingComm.campaign_title}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={availableCampaigns}
                      value={commForm.campaign_id}
                      onChange={(val) => setCommForm({ ...commForm, campaign_id: Number(val) })}
                      placeholder="Pilih kampanye..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">Tipe Komisi</label>
                  <div className="flex gap-2">
                    {(['PERCENTAGE', 'AMOUNT'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCommForm({ ...commForm, commission_type: t })}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border transition-all',
                          commForm.commission_type === t
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                        )}
                      >
                        {t === 'PERCENTAGE' ? <Percent size={12} /> : <Banknote size={12} />}
                        {t === 'PERCENTAGE' ? 'Persen (%)' : 'Nominal (Rp)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">
                    Nilai {commForm.commission_type === 'PERCENTAGE' ? '(%)' : '(Rp)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={commForm.commission_value}
                    onChange={(e) => setCommForm({ ...commForm, commission_value: e.target.value })}
                    placeholder={commForm.commission_type === 'PERCENTAGE' ? '5.00' : '10000'}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-200 disabled:opacity-50"
                >
                  {commSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : editingComm ? (
                    <Save size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  {editingComm ? 'Simpan perubahan' : 'Tambah komisi'}
                </button>
              </div>
            </form>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kampanye</th>
                    <th className="text-center py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rule</th>
                    <th className="text-right py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Klik</th>
                    <th className="text-right py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Donatur</th>
                    <th className="text-right py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raised</th>
                    <th className="text-right py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earned</th>
                    <th className="text-center py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {commissionsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-5"><div className="h-3 w-52 bg-slate-100 rounded" /></td>
                        <td className="py-4 px-5"><div className="h-5 w-20 bg-slate-100 rounded-full mx-auto" /></td>
                        <td className="py-4 px-5"><div className="h-3 w-16 bg-slate-100 rounded ml-auto" /></td>
                        <td className="py-4 px-5"><div className="h-7 w-16 bg-slate-100 rounded-lg mx-auto" /></td>
                      </tr>
                    ))
                  ) : (commissions ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm">
                        Belum ada komisi yang dikonfigurasi.
                      </td>
                    </tr>
                  ) : (
                    (commissions ?? []).map((c) => (
                      <tr
                        key={`${c.affiliate_id}-${c.campaign_id}`}
                        className={cn(
                          'transition-colors group hover:bg-slate-50/50',
                          editingComm?.campaign_id === c.campaign_id && 'bg-amber-50/50'
                        )}
                      >
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-800 leading-snug line-clamp-1">{c.campaign_title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.campaign_slug}</p>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                              c.commission_type === 'PERCENTAGE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}>
                              {c.commission_type === 'PERCENTAGE' ? 'Persen' : 'Nominal'}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {c.commission_type === 'PERCENTAGE' ? `${c.commission_value}%` : formatIDR(c.commission_value)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-medium text-slate-600">
                          {c.click_count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-medium text-slate-600">
                          {c.converted_donors.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-medium text-slate-700">
                          {formatIDR(c.raised_amount)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-emerald-600">
                          {formatIDR(c.commission_earned)}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditComm(c)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteComm(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={cPage}
              totalPages={Math.ceil(((commissions as any)?.[0]?.total_count ?? 0) / cLimit) || 1}
              totalCount={(commissions as any)?.[0]?.total_count ?? 0}
              offset={cOffset}
              limit={cLimit}
              onPageChange={setCPage}
              onLimitChange={(l) => { setCLimit(l); setCPage(1); }}
              isLoading={commissionsLoading}
            />
          </div>
        )}

        {/* ── Tab: Transactions ── */}
        {activeTab === 'transactions' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grand Total Raised</p>
                <p className="text-3xl font-black text-slate-800">{formatIDR(affiliateRow?.raised_amount ?? 0)}</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white px-5 py-3 rounded-xl border border-slate-100 text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Transaksi</p>
                  <p className="text-xl font-bold text-slate-800">{tTotalCount}</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl border border-slate-100 text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Donatur</p>
                  <p className="text-xl font-bold text-slate-800">{affiliateRow?.converted_donors ?? 0}</p>
                </div>
              </div>
            </div>

            <DataTable
              columns={transactionColumns}
              data={(transactions ?? []) as any[]}
              isLoading={transactionsLoading}
              emptyMessage="Belum ada transaksi untuk afiliasi ini."
            />
            
            <Pagination
              currentPage={tPage}
              totalPages={tTotalPages || 1}
              totalCount={tTotalCount}
              offset={tOffset}
              limit={tLimit}
              onPageChange={setTPage}
              onLimitChange={(l) => { setTLimit(l); setTPage(1); }}
              isLoading={transactionsLoading}
            />
          </div>
        )}

        {/* ── Tab: Withdrawals ── */}
        {activeTab === 'withdrawals' && (
          <div className="p-6 space-y-4">
            <DataTable
              columns={withdrawalColumns}
              data={(withdrawals ?? []) as any[]}
              isLoading={withdrawalsLoading}
              emptyMessage="Belum ada withdrawal untuk afiliasi ini."
            />
            <Pagination
              currentPage={wPage}
              totalPages={wTotalPages || 1}
              totalCount={wTotalCount}
              offset={wOffset}
              limit={wLimit}
              onPageChange={setWPage}
              onLimitChange={(l) => { setWLimit(l); setWPage(1); }}
              isLoading={withdrawalsLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
