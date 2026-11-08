"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher, sendJson } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';
import { Users, Send, CheckSquare, Square, Search } from 'lucide-react';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none';

export default function DistribusiMassalPage() {
  const router = useRouter();
  const { data: referensi } = useSWR('/api/penyaluran/referensi', jsonFetcher);

  const [campaignId, setCampaignId] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [jenis, setJenis] = useState<'transfer' | 'tunai' | 'barang' | 'jasa' | 'campuran'>('transfer');
  const [nominalPerPm, setNominalPerPm] = useState('100000');
  const [coaDebet, setCoaDebet] = useState('');
  const [coaKredit, setCoaKredit] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [searchPm, setSearchPm] = useState('');
  const [selectedPmIds, setSelectedPmIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const beneficiaries = referensi?.beneficiaries || [];
  const campaigns = referensi?.campaigns || [];
  const coaList = referensi?.coa || [];

  const handleCampaignChange = (cId: string) => {
    setCampaignId(cId);
    const found = campaigns.find((c: any) => String(c.id) === cId);
    if (found?.coa_expense) setCoaDebet(found.coa_expense);
    if (found?.coa_receipt) setCoaKredit(found.coa_receipt);
  };

  const filteredPm = beneficiaries.filter((pm: any) =>
    pm.nama_lengkap.toLowerCase().includes(searchPm.toLowerCase()) ||
    (pm.kode_beneficiary || '').toLowerCase().includes(searchPm.toLowerCase()) ||
    (pm.kabupaten || '').toLowerCase().includes(searchPm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedPmIds.length === filteredPm.length) {
      setSelectedPmIds([]);
    } else {
      setSelectedPmIds(filteredPm.map((p: any) => p.id));
    }
  };

  const toggleSelectPm = (id: number) => {
    setSelectedPmIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalEstimasi = (Number(nominalPerPm) || 0) * selectedPmIds.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPmIds.length === 0) {
      toast.error('Pilih minimal satu penerima manfaat');
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendJson('/api/penyaluran/distribusi-massal', 'POST', {
        campaign_id: Number(campaignId),
        judul,
        deskripsi: deskripsi || null,
        jenis_penyaluran: jenis,
        nominal_per_pm: Number(nominalPerPm),
        coa_debet: coaDebet,
        coa_kredit: coaKredit,
        beneficiary_ids: selectedPmIds,
        lokasi: lokasi || null,
      });
      toast.success(`Berhasil membuat pengajuan massal ${res.nomor_pengajuan} untuk ${res.total_penerima} penerima.`);
      router.push(`/penyaluran/daftar/${res.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat pengajuan distribusi massal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Distribusi Penyaluran Massal"
        description="Buat satu paket pengajuan penyaluran sekaligus untuk banyak penerima manfaat (bantuan pangan, santunan, dsb)."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Parameter Distribusi */}
        <div className="lg:col-span-1 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 border-b pb-2">Informasi Program & Dana</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Program / Kampanye</label>
            <select
              required
              className={inputClass}
              value={campaignId}
              onChange={(e) => handleCampaignChange(e.target.value)}
            >
              <option value="">Pilih Program</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Judul Penyaluran</label>
            <input
              required
              placeholder="Contoh: Penyaluran Paket Sembako Akbar"
              className={inputClass}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Jenis Penyaluran</label>
              <select
                className={inputClass}
                value={jenis}
                onChange={(e: any) => setJenis(e.target.value)}
              >
                <option value="transfer">Transfer</option>
                <option value="tunai">Tunai</option>
                <option value="barang">Barang</option>
                <option value="jasa">Jasa</option>
                <option value="campuran">Campuran</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nominal per PM</label>
              <input
                required
                type="number"
                className={inputClass}
                value={nominalPerPm}
                onChange={(e) => setNominalPerPm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">COA Debet</label>
              <select required className={inputClass} value={coaDebet} onChange={(e) => setCoaDebet(e.target.value)}>
                <option value="">Pilih COA</option>
                {coaList.map((a: any) => (
                  <option key={a.coa} value={a.coa}>{a.coa} - {a.nama_coa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">COA Kredit</label>
              <select required className={inputClass} value={coaKredit} onChange={(e) => setCoaKredit(e.target.value)}>
                <option value="">Pilih COA</option>
                {coaList.map((a: any) => (
                  <option key={a.coa} value={a.coa}>{a.coa} - {a.nama_coa}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lokasi Kegiatan (Opsional)</label>
            <input
              placeholder="Contoh: Kec. Coblong, Kota Bandung"
              className={inputClass}
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 space-y-1">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Penerima Terpilih:</span>
              <span className="font-bold text-slate-900">{selectedPmIds.length} Orang</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-teal-900 pt-1 border-t border-teal-100">
              <span>Total Pengajuan:</span>
              <span>{formatIDR(totalEstimasi)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || selectedPmIds.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Memproses...' : 'Ajukan Distribusi Massal'}
          </button>
        </div>

        {/* Kolom Kanan: Checklist Penerima Manfaat */}
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-800">
                Pilih Penerima Manfaat Terverifikasi ({selectedPmIds.length}/{beneficiaries.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              {selectedPmIds.length === filteredPm.length && filteredPm.length > 0 ? (
                <>
                  <CheckSquare className="h-4 w-4" /> Batal Pilih Semua
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" /> Pilih Semua
                </>
              )}
            </button>
          </div>

          {/* Pencarian PM */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              placeholder="Cari nama penerima atau kabupaten..."
              className={`${inputClass} pl-9`}
              value={searchPm}
              onChange={(e) => setSearchPm(e.target.value)}
            />
          </div>

          {/* List PM */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 border rounded-xl">
            {filteredPm.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada penerima manfaat yang cocok dengan kriteria pencarian.
              </div>
            ) : (
              filteredPm.map((pm: any) => {
                const isSelected = selectedPmIds.includes(pm.id);
                return (
                  <div
                    key={pm.id}
                    onClick={() => toggleSelectPm(pm.id)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
                      isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pm.nama_lengkap}</p>
                        <p className="text-xs text-slate-400">
                          {pm.kode_beneficiary || `#${pm.id}`} • {pm.kabupaten || 'Tanpa wilayah'} • {pm.asnaf || 'Umum'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {formatIDR(Number(nominalPerPm) || 0)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

