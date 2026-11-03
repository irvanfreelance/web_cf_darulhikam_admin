'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Play,
  Eye,
  Trash2,
  RotateCw,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function AsetPage() {
  const { data: asetList, error, mutate, isLoading } = useSWR('/api/fins/aset', fetcher);
  const [postingMonth, setPostingMonth] = useState(11);
  const [postingYear, setPostingYear] = useState(2026);
  const [isPosting, setIsPosting] = useState(false);
  const [isGenerating, setIsGenerating] = useState<number | null>(null);

  const handlePostSusut = async () => {
    if (!confirm(`Posting penyusutan bulanan untuk seluruh aset pada periode ${postingMonth}/${postingYear}?`)) {
      return;
    }
    setIsPosting(true);
    try {
      const res = await fetch('/api/fins/aset/post-susut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodeBulan: postingMonth, periodeTahun: postingYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memposting penyusutan');
      alert(data.message || 'Sukses memposting');
      mutate();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleGenerateSchedule = async (id: number) => {
    setIsGenerating(id);
    try {
      const res = await fetch(`/api/fins/aset/${id}/schedule`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat jadwal');
      alert(data.message || 'Jadwal berhasil dibuat');
      mutate();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDeleteAset = async (id: number, kode: string) => {
    if (!confirm(`Hapus data aset ${kode}? Aset yang belum ada penyusutan terposting yang bisa dihapus.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fins/aset/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus aset');
      alert('Aset berhasil dihapus');
      mutate();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalBiayaAkuisisi = asetList?.reduce((acc: number, item: any) => acc + Number(item.biaya_akuisisi || 0), 0) || 0;
  const totalAkumulasi = asetList?.reduce((acc: number, item: any) => acc + Number(item.akumulasi_posted || 0), 0) || 0;
  const totalNilaiBuku = totalBiayaAkuisisi - totalAkumulasi;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daftar Aset & Penyusutan</h1>
          <p className="text-sm text-slate-500">
            Pengelolaan aset tetap, kalkulasi depresiasi otomatis, dan posting penyesuaian bulanan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/fins/aset/baru"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Entry Aset Baru
          </Link>
        </div>
      </div>

      {/* KPI Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Biaya Akuisisi</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatIDR(totalBiayaAkuisisi)}</p>
          <span className="text-xs text-slate-400 mt-1 block">{asetList?.length || 0} unit aset terdaftar</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Akumulasi Penyusutan</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">{formatIDR(totalAkumulasi)}</p>
          <span className="text-xs text-slate-400 mt-1 block">Telah dibebankan ke jurnal</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nilai Buku Saat Ini</span>
          <p className="text-2xl font-bold text-teal-700 mt-2">{formatIDR(totalNilaiBuku)}</p>
          <span className="text-xs text-slate-400 mt-1 block">Sisa nilai buku neto</span>
        </div>
      </div>

      {/* Card Post Susut Bulanan */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-950">Posting Penyusutan Bulanan (Batch)</h3>
            <p className="text-xs text-teal-800">
              Posting otomatis seluruh aset aktif ke jurnal penyesuaian (AJE) untuk bulan yang dipilih
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={postingMonth}
              onChange={(e) => setPostingMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </select>
            <select
              value={postingYear}
              onChange={(e) => setPostingYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePostSusut}
            disabled={isPosting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
          >
            {isPosting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Posting Susut Periode
          </button>
        </div>
      </div>

      {/* Tabel Aset */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Kode & Nama Aset</th>
                <th className="px-4 py-3 text-left">Akun / COA</th>
                <th className="px-4 py-3 text-left">Tgl Akuisisi</th>
                <th className="px-4 py-3 text-right">Biaya Akuisisi</th>
                <th className="px-4 py-3 text-center">Metode & Umur</th>
                <th className="px-4 py-3 text-right">Akumulasi Susut</th>
                <th className="px-4 py-3 text-right">Nilai Buku</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Memuat data aset...
                  </td>
                </tr>
              ) : asetList?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Belum ada data aset tetap. Klik Entry Aset Baru untuk menambahkan.
                  </td>
                </tr>
              ) : (
                asetList?.map((item: any) => {
                  const biaya = Number(item.biaya_akuisisi || 0);
                  const susut = Number(item.akumulasi_posted || 0);
                  const nilaiBuku = biaya - susut;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.aset}</div>
                        <div className="text-xs font-mono text-slate-500">{item.kode_aset}</div>
                        {item.kantor_nama && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {item.kantor_nama}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-slate-800">{item.coa}</div>
                        <div className="text-[11px] text-slate-500">Beban: {item.coa_debit}</div>
                        <div className="text-[11px] text-slate-500">Akum: {item.coa_kredit}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {item.tgl_akuisisi ? formatDate(item.tgl_akuisisi) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatIDR(biaya)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                          {item.metode || 'Garis Lurus'}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">{item.masa_manfaat || 0} bln</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">
                        {formatIDR(susut)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal-700">
                        {formatIDR(nilaiBuku)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/fins/aset/${item.id}`}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                            title="Detail & Jadwal"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {Number(item.total_jadwal || 0) === 0 && (
                            <button
                              onClick={() => handleGenerateSchedule(item.id)}
                              disabled={isGenerating === item.id}
                              className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100"
                              title="Buat Jadwal Penyusutan"
                            >
                              {isGenerating === item.id ? 'Membuat...' : 'Buat Jadwal'}
                            </button>
                          )}
                          {susut === 0 && (
                            <button
                              onClick={() => handleDeleteAset(item.id, item.kode_aset)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
