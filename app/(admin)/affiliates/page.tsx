"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Plus, Search, Edit, Trash2, Eye, X, Save, Loader2,
  Users, UserPlus, Filter, XCircle, Download, ExternalLink,
  ChevronRight, ArrowRight, AlertCircle, LayoutGrid, List, Heart, Mail, Phone
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { formatIDR } from '@/lib/format';

import { cn } from '@/lib/utils';

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  });

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
  total_count?: number;
}


// ═══════════════════════════════════════════════════════════════════════════
export default function AffiliatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'CARD' | 'TABLE'>('CARD');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const {
    data: affiliates,
    error,
    isLoading,
    mutate,
  } = useSWR<Affiliate[]>(
    `/api/affiliates?limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}`,
    fetcher
  );

  const totalCount: number = (affiliates as any)?.[0]?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  // ── Modal: Create / Edit Affiliate ──────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [formData, setFormData] = useState({
    affiliate_code: '',
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (affiliate: Affiliate | null = null) => {
    setSelectedAffiliate(affiliate);
    setFormData(
      affiliate
        ? {
            affiliate_code: affiliate.affiliate_code,
            name: affiliate.name,
            email: affiliate.email,
            phone: affiliate.phone || '',
            status: affiliate.status,
          }
        : { affiliate_code: '', name: '', email: '', phone: '', status: 'ACTIVE' }
    );
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = selectedAffiliate ? 'PATCH' : 'POST';
      const body = selectedAffiliate
        ? { id: selectedAffiliate.id, ...formData }
        : formData;
      const res = await fetch('/api/affiliates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save affiliate');
      }
      toast.success(selectedAffiliate ? 'Afiliasi diperbarui' : 'Afiliasi berhasil dibuat');
      mutate();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    toast('Hapus afiliasi ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/affiliates?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Afiliasi berhasil dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  // Navigate to detail page
  const handleOpenDetail = (aff: Affiliate) => {
    router.push(`/affiliates/${aff.id}`);
  };

  // ── Table Columns ────────────────────────────────────────────────────────
  const columns = [
    {
      header: '#',
      headerClassName: 'w-12 text-center',
      className: 'text-center text-xs font-normal text-slate-400',
      cell: (_: any, idx: number) => offset + idx + 1,
    },
    {
      header: 'Afiliasi',
      cell: (aff: Affiliate) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md flex-shrink-0">
            {aff.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="font-semibold text-slate-800 text-sm">{aff.name}</span>
            <span className="text-[10px] text-slate-400 font-medium">{aff.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Kode',
      cell: (aff: Affiliate) => (
        <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          {aff.affiliate_code}
        </span>
      ),
    },
    {
      header: 'Impact',
      className: 'text-center text-sm font-normal text-slate-700',
      cell: (aff: Affiliate) => `${aff.converted_donors ?? 0} Donatur`,
    },
    {
      header: 'Raised',
      headerClassName: 'text-right',
      className: 'text-right font-medium text-slate-800 text-xs',
      cell: (aff: Affiliate) => formatIDR(aff.raised_amount ?? 0),
    },
    {
      header: 'Saldo',
      headerClassName: 'text-right',
      className: 'text-right font-bold text-teal-600 text-xs',
      cell: (aff: Affiliate) => formatIDR(aff.balance ?? 0),
    },
    {
      header: 'Status',
      className: 'text-center',
      cell: (aff: Affiliate) => (
        <Badge variant={aff.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {aff.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      header: 'Aksi',
      className: 'text-center',
      cell: (aff: Affiliate) => (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => handleOpenDetail(aff)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Detail & Komisi"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenModal(aff)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(aff.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Hapus"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
        <AlertCircle size={20} />
        <span className="font-medium">Error memuat data: {error.message}</span>
      </div>
    );
  }


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <PageHeader title="Manajemen Afiliasi" description="Kelola network fundraiser">
        <div className="flex gap-3 mt-4 sm:mt-0 items-center">
          <div className="flex bg-white border border-slate-100 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setView('CARD')}
              className={cn(
                'p-2 rounded-xl transition-all',
                view === 'CARD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView('TABLE')}
              className={cn(
                'p-2 rounded-xl transition-all',
                view === 'TABLE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              )}
            >
              <List size={18} />
            </button>
          </div>
          <Button onClick={() => handleOpenModal()} className="shrink-0">
            <Plus size={18} strokeWidth={3} /> Tambah Afiliasi
          </Button>
        </div>
      </PageHeader>

      {/* ── Search Bar ── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px] group text-left">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          />
          <Input
            type="text"
            placeholder="Cari nama atau kode affiliate..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* ── Card / Table View ── */}
      {view === 'CARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="h-56 bg-white rounded-2xl animate-pulse border border-slate-100" />
              ))
            : (affiliates ?? []).length > 0
            ? (affiliates ?? []).map((aff) => (
                <div
                  key={aff.id}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden text-left"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shadow-indigo-100">
                      <Heart
                        size={24}
                        className="transition-all fill-indigo-50 group-hover:fill-indigo-400"
                      />
                    </div>
                    <Badge variant={aff.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {aff.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-normal text-slate-800 leading-tight mb-1">{aff.name}</h3>
                  <p className="text-xs font-mono font-semibold text-indigo-600 mb-4">
                    Kode: {aff.affiliate_code}
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                      <Mail size={14} className="text-slate-300" /> {aff.email}
                    </div>
                    {aff.phone && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                        <Phone size={14} className="text-slate-300" /> {aff.phone}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
                    <div className="text-left">
                      <p className="text-[10px] font-normal text-slate-400 mb-1">Impact</p>
                      <p className="text-xs font-semibold text-slate-800">{aff.converted_donors ?? 0} Donatur</p>
                    </div>
                    <div className="text-left border-l border-slate-50 pl-3">
                      <p className="text-[10px] font-normal text-slate-400 mb-1">Raised</p>
                      <p className="text-xs font-semibold text-emerald-600 truncate">
                        {formatIDR(aff.raised_amount ?? 0)}
                      </p>
                    </div>
                    <div className="text-left border-l border-slate-50 pl-3">
                      <p className="text-[10px] font-normal text-slate-400 mb-1">Saldo</p>
                      <p className="text-xs font-bold text-teal-600 truncate">
                        {formatIDR(aff.balance ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenDetail(aff)}
                      className="p-2 bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm border border-slate-100"
                      title="Detail & Komisi"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(aff)}
                      className="p-2 bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm border border-slate-100"
                      title="Edit"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(aff.id)}
                      className="p-2 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm border border-slate-100"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            : (
                <div className="col-span-full py-16 text-center text-slate-400 italic">
                  Tidak ada afiliasi ditemukan.
                </div>
              )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(affiliates ?? []) as any[]}
          isLoading={isLoading}
          emptyMessage="Tidak ada afiliasi ditemukan."
        />
      )}

      {/* ── Pagination ── */}
      <Pagination
        currentPage={page}
        totalPages={totalPages || 1}
        totalCount={totalCount}
        offset={offset}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        isLoading={isLoading}
      />

      {/* ══════════════════════════════════════════════════════════════════
          Modal: Create / Edit Affiliate
      ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-left">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight">
                {selectedAffiliate ? 'Edit afiliasi' : 'Daftar afiliasi baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Kode unik</label>
                  <Input
                    required
                    value={formData.affiliate_code}
                    onChange={(e) =>
                      setFormData({ ...formData, affiliate_code: e.target.value.toUpperCase() })
                    }
                    placeholder="KODE_UNIK"
                    className="font-mono"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Status</label>
                  <SearchableSelect
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: String(val) })}
                    options={[
                      { id: 'ACTIVE', name: 'Aktif' },
                      { id: 'INACTIVE', name: 'Nonaktif' },
                    ]}
                  />
                </div>
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nama lengkap</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap..."
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Email</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email agent..."
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  WhatsApp / Telepon
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08xxxxxxxx"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button disabled={isSubmitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-700">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan
                  agent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
