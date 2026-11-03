'use client';

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  ArrowLeft,
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

export default function DetailAsetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: aset, error: asetErr } = useSWR(`/api/fins/aset/${id}`, fetcher);
  const { data: schedules, error: schedErr, isLoading } = useSWR(
    `/api/fins/aset/${id}/schedule`,
    fetcher
  );

  if (asetErr) {
    return (
      <div className="p-6 text-center text-rose-600">
        Gagal memuat data aset: {asetErr.message}
      </div>
    );
  }

  if (!aset) {
    return <div className="p-6 text-center text-slate-500">Memuat detail aset...</div>;
  }

  const biaya = Number(aset.biaya_akuisisi || 0);
  const akumulasi = Number(aset.akumulasi_posted || 0);
  const nilaiBuku = biaya - akumulasi;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/fins/aset"
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{aset.aset}</h1>
          <p className="text-sm text-slate-500 font-mono">{aset.kode_aset}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block uppercase">Biaya Perolehan</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {formatIDR(biaya)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {aset.tgl_akuisisi ? formatDate(aset.tgl_akuisisi) : '-'}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block uppercase">Akumulasi Penyusutan</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {formatIDR(akumulasi)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {aset.jadwal_posted || 0} dari {aset.total_jadwal || 0} bulan
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block uppercase">Nilai Buku Neto</span>
          <span className="text-xl font-bold text-teal-700 mt-1 block">
            {formatIDR(nilaiBuku)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Sisa perolehan</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block uppercase">Metode & Umur</span>
          <span className="text-base font-semibold text-slate-900 mt-1 block">
            {aset.metode || 'Garis Lurus'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {aset.masa_manfaat} Bulan ({Math.round(aset.masa_manfaat / 12)} Tahun)
          </span>
        </div>
      </div>

      {/* Deskripsi & Akun */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Spesifikasi & Akun Jurnal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Akun Aset (Neraca):</span>
            <span className="font-mono font-medium text-slate-800">{aset.coa}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Akun Beban Penyusutan:</span>
            <span className="font-mono font-medium text-slate-800">{aset.coa_debit}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Akun Akumulasi Penyusutan:</span>
            <span className="font-mono font-medium text-slate-800">{aset.coa_kredit}</span>
          </div>
        </div>
        {aset.deskripsi && (
          <div className="pt-2 text-xs text-slate-600 border-t border-slate-100">
            <span className="text-slate-400 block mb-0.5">Catatan:</span>
            {aset.deskripsi}
          </div>
        )}
      </div>

      {/* Jadwal Penyusutan */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Jadwal Amortisasi / Penyusutan</h2>
          <span className="text-xs text-slate-500">
            Total {schedules?.length || 0} periode jadwal
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3 text-center">Periode</th>
                <th className="px-4 py-3 text-right">Nilai Buku Awal</th>
                <th className="px-4 py-3 text-right">Penyusutan</th>
                <th className="px-4 py-3 text-right">Akumulasi</th>
                <th className="px-4 py-3 text-right">Nilai Buku Akhir</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Fins Trans ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Memuat jadwal penyusutan...
                  </td>
                </tr>
              ) : schedules?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Belum ada jadwal penyusutan.
                  </td>
                </tr>
              ) : (
                schedules?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/75">
                    <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                      {row.urutan_periode}
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-800 whitespace-nowrap">
                      {String(row.periode_bulan).padStart(2, '0')}/{row.periode_tahun}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                      {formatIDR(Number(row.nilai_buku_awal))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-rose-600">
                      {formatIDR(Number(row.nilai_susut))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">
                      {formatIDR(Number(row.akumulasi_susut))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-teal-700">
                      {formatIDR(Number(row.nilai_buku_akhir))}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.status === 'posted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          Posted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          <Clock className="w-3 h-3" />
                          Scheduled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-left text-xs font-mono text-slate-500">
                      {row.fins_trans_id || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
