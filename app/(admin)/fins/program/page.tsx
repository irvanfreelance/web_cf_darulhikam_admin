"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Edit2, Plus, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { jsonFetcher } from '@/lib/json-client';

type Program = {
  id: number;
  kode: string;
  nama: string;
  dp_percent: number;
  aktif: boolean;
  campaign_id: number | null;
  campaign_title: string | null;
  created_at: string;
};

type Campaign = {
  id: number;
  title: string;
};

export default function FinsProgramPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    search,
    status,
    limit: String(limit),
    offset: String(offset),
  });

  const { data, error, isLoading, mutate } = useSWR<{ rows: Program[]; total: number }>(
    `/api/fins/program?${params.toString()}`,
    jsonFetcher
  );

  const { data: campaigns } = useSWR<Campaign[]>(
    '/api/campaigns?status=ACTIVE&limit=100',
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json();
      return json.campaigns || json || [];
    }
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    dp_percent: 0,
    campaign_id: '' as string | number,
    aktif: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingProgram(null);
    setFormData({
      kode: '',
      nama: '',
      dp_percent: 0,
      campaign_id: '',
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    setEditingProgram(prog);
    setFormData({
      kode: prog.kode,
      nama: prog.nama,
      dp_percent: Number(prog.dp_percent || 0),
      campaign_id: prog.campaign_id || '',
      aktif: prog.aktif,
    });
    setIsModalOpen(true);
  };

  const handleToggleAktif = async (prog: Program) => {
    try {
      toast.loading('Memperbarui status...');
      const res = await fetch(`/api/fins/program/${prog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: !prog.aktif }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status');
      toast.dismiss();
      toast.success(`Program ${prog.kode} berhasil ${!prog.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
      mutate();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingProgram) {
        const res = await fetch(`/api/fins/program/${editingProgram.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: formData.nama,
            dp_percent: Number(formData.dp_percent),
            campaign_id: formData.campaign_id ? Number(formData.campaign_id) : null,
            aktif: formData.aktif,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal memperbarui program');
        }
        toast.success('Program berhasil diperbarui');
      } else {
        const res = await fetch('/api/fins/program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kode: formData.kode,
            nama: formData.nama,
            dp_percent: Number(formData.dp_percent),
            campaign_id: formData.campaign_id ? Number(formData.campaign_id) : null,
            aktif: formData.aktif,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal menambahkan program');
        }
        toast.success('Program baru berhasil ditambahkan');
      }

      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Master Program FINS"
        description="Master program lembaga dan persentase Dana Pengelola (DP) untuk akuntansi keuangan"
      >
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} /> Tambah Program
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      {/* Filter Box */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode atau nama program..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="w-12 px-4 py-3 font-medium text-center">No</th>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Program</th>
                <th className="px-4 py-3 font-medium text-right">Dana Pengelola (DP %)</th>
                <th className="px-4 py-3 font-medium">Relasi Campaign</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Memuat data program...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Gagal memuat data program.
                  </td>
                </tr>
              ) : data?.rows?.length ? (
                data.rows.map((prog, idx) => (
                  <tr key={prog.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center text-xs text-slate-500 font-medium">
                      {offset + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{prog.kode}</td>
                    <td className="px-4 py-3 text-slate-700">{prog.nama}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {Number(prog.dp_percent || 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {prog.campaign_title || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAktif(prog)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          prog.aktif
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                        title="Klik untuk ubah status"
                      >
                        {prog.aktif ? (
                          <>
                            <CheckCircle size={13} /> Aktif
                          </>
                        ) : (
                          <>
                            <XCircle size={13} /> Nonaktif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openEditModal(prog)}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        title="Edit Program"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Belum ada program pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          offset={offset}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingProgram ? 'Edit Program FINS' : 'Tambah Program FINS'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Program <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  disabled={!!editingProgram}
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  placeholder="Contoh: ZKT, IFQ, WQF"
                  maxLength={30}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm uppercase focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Program <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Zakat Fitrah & Mal"
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Persentase Dana Pengelola / Hak Amil (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.dp_percent}
                  onChange={(e) => setFormData({ ...formData, dp_percent: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">Umumnya 12.5% untuk Zakat, 20% untuk Infaq.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relasi Kampanye Crowdfunding (Opsional)
                </label>
                <select
                  value={formData.campaign_id}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Tidak terikat kampanye khusus —</option>
                  {(campaigns || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="statusAktifCheck"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="statusAktifCheck" className="text-sm font-medium text-slate-700">
                  Program Aktif
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
