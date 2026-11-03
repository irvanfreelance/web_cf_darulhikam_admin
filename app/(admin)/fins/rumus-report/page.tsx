"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Edit2, Save, FileSpreadsheet, Check, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';

type ReportRow = {
  id: number;
  nama_coa: string;
  level: number;
  coa: string;
  report: string;
  active: 'y' | 'n';
  sort: number;
  keterangan: string;
  kode: string;
};

export default function RumusReportPage() {
  const [activeReport, setActiveReport] = useState<'LPK' | 'LPO' | 'LAK' | 'LPD'>('LPK');

  const { data: rows, isLoading, mutate } = useSWR<ReportRow[]>(
    `/api/fins/rumus-report?report=${activeReport}`,
    jsonFetcher
  );

  const [editingRow, setEditingRow] = useState<ReportRow | null>(null);
  const [form, setForm] = useState({
    nama_coa: '',
    coa: '',
    level: 0,
    sort: 1,
    active: 'y' as 'y' | 'n',
    keterangan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (r: ReportRow) => {
    setEditingRow(r);
    setForm({
      nama_coa: r.nama_coa,
      coa: r.coa || '',
      level: Number(r.level || 0),
      sort: Number(r.sort || 1),
      active: r.active,
      keterangan: r.keterangan || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/fins/rumus-report/${editingRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan konfigurasi');
      }

      toast.success('Rumus baris laporan berhasil diperbarui');
      setEditingRow(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Konfigurasi Rumus Report"
        description="Pemetaan baris pos laporan keuangan (LPK, LPO, LAK, LPD) dan relasi kode COA akun induk/anak"
      />

      {/* Tabs Jenis Laporan */}
      <div className="flex border-b border-slate-200">
        {(['LPK', 'LPO', 'LAK', 'LPD'] as const).map((rep) => (
          <button
            key={rep}
            type="button"
            onClick={() => setActiveReport(rep)}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
              activeReport === rep
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {rep === 'LPK' && 'Posisi Keuangan (LPK)'}
            {rep === 'LPO' && 'Penghasilan Operasional (LPO)'}
            {rep === 'LAK' && 'Arus Kas (LAK)'}
            {rep === 'LPD' && 'Perubahan Dana (LPD)'}
          </button>
        ))}
      </div>

      {/* Tabel Baris Rumus */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="w-12 px-3 py-3 font-medium text-center">Urutan</th>
                <th className="w-16 px-3 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Pos Laporan</th>
                <th className="px-4 py-3 font-medium">Akun / Prefix COA</th>
                <th className="w-16 px-3 py-3 font-medium text-center">Level</th>
                <th className="w-20 px-3 py-3 font-medium text-center">Status</th>
                <th className="w-16 px-3 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat konfigurasi rumus...</td></tr>
              ) : rows?.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-center text-xs font-mono text-slate-500">{r.sort}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">{r.kode}</td>
                    <td className="px-4 py-2.5">
                      <div
                        className="text-slate-800"
                        style={{ paddingLeft: `${Number(r.level || 0) * 16}px` }}
                        dangerouslySetInnerHTML={{ __html: r.nama_coa }}
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-teal-800">
                      {r.coa || <span className="text-slate-400 font-sans italic">— Judul / Header —</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-500">{r.level}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.active === 'y' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.active === 'y' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                        title="Edit Rumus"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum ada baris konfigurasi laporan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Rumus */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Edit Pos & Rumus Report</h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pos Laporan</label>
                <input
                  required
                  value={form.nama_coa}
                  onChange={(e) => setForm({ ...form, nama_coa: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akun / Prefix COA</label>
                <input
                  value={form.coa}
                  onChange={(e) => setForm({ ...form, coa: e.target.value })}
                  placeholder="Contoh: 101.00.000.000 (Kosongkan bila judul)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">COA induk berakhiran .000 akan otomatis menjumlahkan semua turunan.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Urutan Sort</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Indent Level (0-4)</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Baris</label>
                <select
                  value={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="y">Aktif</option>
                  <option value="n">Nonaktif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

