'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { formatIDR } from '@/lib/format';

export default function BaruAsetPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    kodeAset: `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    aset: '',
    coa: '103.01.001.000',
    coaDebit: '503.01.001.000',
    coaKredit: '103.02.001.000',
    deskripsi: '',
    tglAkuisisi: new Date().toISOString().slice(0, 10),
    biayaAkuisisi: 10000000,
    idKantor: 1,
    metode: 'Garis Lurus',
    masaManfaat: 48,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const monthlyDepreciation =
    form.masaManfaat > 0 && form.metode === 'Garis Lurus'
      ? Math.round(form.biayaAkuisisi / form.masaManfaat)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/fins/aset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (data.errors ? JSON.stringify(data.errors) : 'Gagal menyimpan aset'));
      }

      router.push('/fins/aset');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/fins/aset"
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entry Aset Tetap Baru</h1>
          <p className="text-sm text-slate-500">
            Daftarkan inventaris / aset tetap baru beserta skema penyusutan bulanannya
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Kode Aset <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.kodeAset}
              onChange={(e) => setForm({ ...form, kodeAset: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Aset / Inventaris <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Laptop Macbook Pro M3 Admin"
              value={form.aset}
              onChange={(e) => setForm({ ...form, aset: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tanggal Akuisisi <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.tglAkuisisi}
              onChange={(e) => setForm({ ...form, tglAkuisisi: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Biaya Akuisisi (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.biayaAkuisisi}
              onChange={(e) => setForm({ ...form, biayaAkuisisi: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Metode Penyusutan
            </label>
            <select
              value={form.metode}
              onChange={(e) => setForm({ ...form, metode: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Garis Lurus">Garis Lurus (Straight Line)</option>
              <option value="Saldo Menurun">Saldo Menurun (Declining Balance)</option>
              <option value="Jumlah Angka Tahun">Jumlah Angka Tahun (Sum of Years)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Masa Manfaat (Bulan) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.masaManfaat}
              onChange={(e) => setForm({ ...form, masaManfaat: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-xs text-slate-500 mt-1 block">
              Contoh: 48 bulan (4 tahun), 60 bulan (5 tahun)
            </span>
          </div>

          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Akun COA Terkait</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Akun Aset (Neraca) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.coa}
                  onChange={(e) => setForm({ ...form, coa: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Beban Penyusutan (Debet) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.coaDebit}
                  onChange={(e) => setForm({ ...form, coaDebit: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Akumulasi Penyusutan (Kredit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.coaKredit}
                  onChange={(e) => setForm({ ...form, coaKredit: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi & Catatan</label>
            <textarea
              rows={3}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Lokasi aset, nomor seri, penanggung jawab, dll..."
            />
          </div>
        </div>

        {/* Kalkulasi Preview */}
        {form.metode === 'Garis Lurus' && (
          <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-4 text-xs text-teal-900 flex justify-between items-center">
            <span>Estimasi Penyusutan Bulanan:</span>
            <span className="font-bold text-sm text-teal-950 font-mono">
              {formatIDR(monthlyDepreciation)} / bulan
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/fins/aset"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan & Generate Jadwal'}
          </button>
        </div>
      </form>
    </div>
  );
}
