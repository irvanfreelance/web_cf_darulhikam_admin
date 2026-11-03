"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Eye, Loader2, Plus, Search, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import KPICard from '@/components/shared/kpi-card';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { Users, BadgeCheck, User } from 'lucide-react';
import type { CrmDonor, CrmDonorStats, CrmKantor, CrmTeam } from '@/types/crm';

type ListResponse = { rows: CrmDonor[]; total: number; stats: CrmDonorStats };

export default function CrmDonorsPage() {
  const [search, setSearch] = useState('');
  const [jenis, setJenis] = useState('all');
  const [status, setStatus] = useState('all');
  const [gender, setGender] = useState('all');
  const [kantorId, setKantorId] = useState('');
  const [timId, setTimId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    search, jenis, status, gender, limit: String(limit), offset: String(offset),
  });
  if (kantorId) params.set('kantor_id', kantorId);
  if (timId) params.set('tim_crm_id', timId);

  const { data, error, isLoading } = useSWR<ListResponse>(`/api/crm/donors?${params.toString()}`, jsonFetcher);
  const { data: teams } = useSWR<CrmTeam[]>('/api/crm/teams', jsonFetcher);
  const { data: offices } = useSWR<CrmKantor[]>('/api/crm/kantor', jsonFetcher);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.loading('Mempersiapkan data export...');
      const exportParams = new URLSearchParams({
        search,
        jenis,
        status,
        gender,
        limit: '10000',
        offset: '0',
      });
      if (kantorId) exportParams.set('kantor_id', kantorId);
      if (timId) exportParams.set('tim_crm_id', timId);

      const res = await fetch(`/api/crm/donors?${exportParams.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil data export');
      const json: ListResponse = await res.json();
      const exportRows = json?.rows || [];

      if (exportRows.length === 0) {
        toast.dismiss();
        toast.error('Tidak ada data untuk diexport');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        exportRows.map((donor, idx) => ({
          'No': idx + 1,
          'ID': donor.id,
          'NIK': donor.nik || '-',
          'Nama Donatur': donor.name,
          'Jenis': donor.jenis || '-',
          'Jenis Kelamin': donor.jenis_kelamin || '-',
          'No. HP/Telepon': donor.phone || '-',
          'Email': donor.email || '-',
          'Alamat': donor.alamat || '-',
          'Status': donor.status_aktif ? 'Aktif' : 'Nonaktif',
          'Tim CRM': donor.tim_crm_nama || '-',
          'Total Donasi': Number(donor.total_donated || 0),
          'Jumlah Donasi': Number(donor.donation_count || 0),
          'Minat Program': donor.minat_program || '-',
          'Tanggal Terdaftar': donor.created_at ? new Date(donor.created_at).toLocaleDateString('id-ID') : '-',
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Donatur');
      XLSX.writeFile(workbook, `Data_Donatur_CRM_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.dismiss();
      toast.success('Data donatur berhasil diexport');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Gagal export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader title="Data Donatur" description="Profil CRM, filter, dan impor baris baru">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Download size={16} className="text-teal-600" />}
          Export Excel
        </button>
        <Link href="/crm/donors/import" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
          <Upload size={16} /> Impor
        </Link>
        <Link href="/crm/donors/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
          <Plus size={16} /> Tambah
        </Link>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error.message}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard title="Total donatur" value={data?.stats.total ?? 0} icon={Users} color="text-slate-600" bg="bg-slate-100" />
        <KPICard title="Aktif" value={data?.stats.aktif ?? 0} icon={BadgeCheck} color="text-emerald-600" bg="bg-emerald-50" />
        <KPICard title="Prospek" value={data?.stats.prospek ?? 0} icon={User} color="text-teal-600" bg="bg-teal-50" />
      </div>
      <p className="text-xs text-slate-400">Prospek adalah donatur aktif yang belum memiliki invoice berstatus PAID. Donatur yang sudah digabung disembunyikan dari daftar.</p>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-3">
        <div className="relative md:col-span-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Cari donatur"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama, email, telepon, NIK, atau minat program"
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select aria-label="Jenis" value={jenis} onChange={(e) => { setJenis(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua jenis</option>
          <option value="perorangan">Perorangan</option>
          <option value="perusahaan">Perusahaan</option>
          <option value="komunitas">Komunitas</option>
        </select>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
        <select aria-label="Jenis kelamin" value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="all">Semua gender</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <select aria-label="Kantor" value={kantorId} onChange={(e) => { setKantorId(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="">Semua kantor</option>
          {(offices ?? []).map((office) => <option key={office.id} value={office.id}>{office.nama}</option>)}
        </select>
        <select aria-label="Tim CRM" value={timId} onChange={(e) => { setTimId(e.target.value); setPage(1); }} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <option value="">Semua tim</option>
          {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.nama}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="w-12 px-4 py-3 font-medium text-center">No</th>
                <th className="px-4 py-3 font-medium">Donatur</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium">Kontak</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tim</th>
                <th className="px-4 py-3 text-right font-medium">Total donasi</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Daftar tidak dapat dimuat.</td></tr>
              ) : data?.rows?.length ? data.rows.map((donor, idx) => (
                <tr key={donor.id} className="border-t border-slate-50">
                  <td className="px-4 py-3 text-center text-xs text-slate-500 font-medium">
                    {offset + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/crm/donors/${donor.id}`} className="font-medium text-slate-800 underline-offset-2 hover:text-teal-700 hover:underline">
                      {donor.name}
                    </a>
                    <div className="text-xs text-slate-400">{donor.nik || `ID ${donor.id}`}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{donor.jenis}{donor.jenis_kelamin ? ` · ${donor.jenis_kelamin}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{donor.phone || '—'}</div>
                    <div className="text-xs text-slate-400">{donor.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={donor.status_aktif ? 'text-emerald-600' : 'text-rose-600'}>
                      {donor.status_aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{donor.tim_crm_nama || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{formatIDR(Number(donor.total_donated || 0))}</td>
                  <td className="px-4 py-3 text-center">
                    <a href={`/crm/donors/${donor.id}`} className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700" aria-label={`Detail ${donor.name}`}>
                      <Eye size={16} />
                    </a>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum ada donatur pada filter ini.</td></tr>
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
          onLimitChange={(next) => { setLimit(next); setPage(1); }}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
