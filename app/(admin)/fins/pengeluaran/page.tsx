"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowRightLeft, Check, CheckCircle2, DollarSign, Loader2, Plus, Search, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';
import { formatIDR } from '@/lib/format';

export default function PengeluaranPage() {
  const [activeTab, setActiveTab] = useState<'pengeluaran' | 'mutasi'>('pengeluaran');

  // Pengeluaran
  const { data: expenses, isLoading: loadingExpenses, mutate: mutateExpenses } = useSWR<any[]>(
    '/api/fins/pengeluaran',
    jsonFetcher
  );

  // Mutasi
  const { data: transfers, isLoading: loadingTransfers, mutate: mutateTransfers } = useSWR<any[]>(
    '/api/fins/mutasi',
    jsonFetcher
  );

  const { data: coaList } = useSWR<any[]>('/api/fins/coa', async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    return (json?.rows || json || []).filter((c: any) => c.active === 'y' && c.parent === 'n');
  });

  const { data: bankAccounts } = useSWR<any[]>('/api/fins/rekening-bank', async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    return json?.rows || json || [];
  });

  // Modal Pengeluaran
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expForm, setExpForm] = useState({
    judul: '',
    jenis: 'operasional_rutin',
    coaDebet: '',
    coaKredit: '',
    tglPengajuan: new Date().toISOString().slice(0, 10),
    metodeBayar: 'bank',
    items: [{ keterangan: '', qty: 1, satuan: 'pcs', hargaSatuan: 0, subtotal: 0 }],
  });

  // Modal Mutasi
  const [isTrfModalOpen, setIsTrfModalOpen] = useState(false);
  const [trfSubmitting, setTrfSubmitting] = useState(false);
  const [trfForm, setTrfForm] = useState({
    dariRekeningId: '',
    keRekeningId: '',
    jumlah: 0,
    biayaTransfer: 0,
    tglKirim: new Date().toISOString().slice(0, 10),
    buktiTransferUrl: '',
  });

  const handleAddExpenseItem = () => {
    setExpForm((prev) => ({
      ...prev,
      items: [...prev.items, { keterangan: '', qty: 1, satuan: 'pcs', hargaSatuan: 0, subtotal: 0 }],
    }));
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setExpSubmitting(true);
      const res = await fetch('/api/fins/pengeluaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan pengeluaran');
      }

      toast.success('Pengajuan pengeluaran berhasil disimpan');
      setIsExpModalOpen(false);
      mutateExpenses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleExpenseApprove = async (id: number, action: 'approve' | 'pay' | 'reject') => {
    try {
      toast.loading('Memproses transaksi...');
      const res = await fetch(`/api/fins/pengeluaran/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memproses transaksi');
      }

      toast.dismiss();
      toast.success(
        action === 'pay'
          ? 'Pengeluaran telah dibayar & jurnal terbit'
          : action === 'approve'
          ? 'Pengeluaran disetujui'
          : 'Pengeluaran ditolak'
      );
      mutateExpenses();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trfForm.dariRekeningId === trfForm.keRekeningId) {
      toast.error('Rekening asal dan tujuan tidak boleh sama');
      return;
    }

    try {
      setTrfSubmitting(true);
      const res = await fetch('/api/fins/mutasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trfForm,
          dariRekeningId: Number(trfForm.dariRekeningId),
          keRekeningId: Number(trfForm.keRekeningId),
          jumlah: Number(trfForm.jumlah),
          biayaTransfer: Number(trfForm.biayaTransfer || 0),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan mutasi rekening');
      }

      toast.success('Mutasi kas/bank berhasil & jurnal otomatis diterbitkan');
      setIsTrfModalOpen(false);
      mutateTransfers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTrfSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Pengeluaran & Mutasi Rekening"
        description="Kelola pengajuan belanja operasional/program serta transfer mutasi dana antar rekening kas & bank"
      >
        {activeTab === 'pengeluaran' ? (
          <button
            type="button"
            onClick={() => setIsExpModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} /> Input Pengeluaran
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsTrfModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <ArrowRightLeft size={16} /> Mutasi Antar Rekening
          </button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('pengeluaran')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'pengeluaran'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Daftar Pengeluaran Belanja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mutasi')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mutasi'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Mutasi Kas & Antar Bank
        </button>
      </div>

      {/* TAB 1: PENGELUARAN */}
      {activeTab === 'pengeluaran' && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomor / Tanggal</th>
                  <th className="px-4 py-3 font-medium">Judul & Kategori</th>
                  <th className="px-4 py-3 font-medium">Akun Debet / Kredit</th>
                  <th className="px-4 py-3 text-right font-medium">Total Nominal</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingExpenses ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat pengeluaran...</td></tr>
                ) : expenses?.length ? (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{exp.nomor_expense}</div>
                        <div className="text-xs text-slate-400">{exp.tgl_pengajuan?.slice(0, 10)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{exp.judul}</div>
                        <div className="text-xs text-slate-400 capitalize">{exp.jenis?.replace('_', ' ')}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-rose-700 font-medium">D: {exp.coa_debet}</div>
                        <div className="text-teal-700 font-medium">K: {exp.coa_kredit}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatIDR(Number(exp.total_amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          exp.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : exp.status === 'approved'
                            ? 'bg-blue-50 text-blue-700'
                            : exp.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {exp.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleExpenseApprove(exp.id, 'approve')}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                          >
                            Approve
                          </button>
                        )}
                        {exp.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleExpenseApprove(exp.id, 'pay')}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                          >
                            Bayar & Jurnal
                          </button>
                        )}
                        {exp.status === 'paid' && (
                          <span className="text-xs text-slate-400">Lunas</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada pengeluaran belanja.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MUTASI */}
      {activeTab === 'mutasi' && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomor Mutasi / Tanggal</th>
                  <th className="px-4 py-3 font-medium">Dari Rekening (Asal)</th>
                  <th className="px-4 py-3 font-medium">Ke Rekening (Tujuan)</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah Ditransfer</th>
                  <th className="px-4 py-3 text-right font-medium">Biaya Admin</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingTransfers ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat mutasi...</td></tr>
                ) : transfers?.length ? (
                  transfers.map((trf) => (
                    <tr key={trf.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{trf.nomor_transfer}</div>
                        <div className="text-xs text-slate-400">{trf.tgl_kirim?.slice(0, 10)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{trf.dari_rekening_label || 'Kas/Bank'}</div>
                        <div className="text-xs text-slate-400">COA: {trf.dari_coa}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{trf.ke_rekening_label || 'Kas/Bank'}</div>
                        <div className="text-xs text-slate-400">COA: {trf.ke_coa}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatIDR(Number(trf.jumlah))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatIDR(Number(trf.biaya_transfer || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 capitalize">
                          <Check size={12} /> {trf.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada mutasi antar rekening.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Input Pengeluaran */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800">Input Pengajuan Pengeluaran</h3>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Pengeluaran</label>
                <input
                  required
                  value={expForm.judul}
                  onChange={(e) => setExpForm({ ...expForm, judul: e.target.value })}
                  placeholder="Contoh: Pembelian ATK Kantor"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={expForm.tglPengajuan}
                    onChange={(e) => setExpForm({ ...expForm, tglPengajuan: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Belanja</label>
                  <select
                    value={expForm.jenis}
                    onChange={(e) => setExpForm({ ...expForm, jenis: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="operasional_rutin">Operasional Rutin</option>
                    <option value="pembayaran_langsung">Pembayaran Langsung</option>
                    <option value="reimbursement">Reimbursement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Beban (Debet)</label>
                <select
                  required
                  value={expForm.coaDebet}
                  onChange={(e) => setExpForm({ ...expForm, coaDebet: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Beban —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>{c.coa} - {c.nama_perkiraan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Kas/Bank Keluar (Kredit)</label>
                <select
                  required
                  value={expForm.coaKredit}
                  onChange={(e) => setExpForm({ ...expForm, coaKredit: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Akun Kas / Bank —</option>
                  {(coaList || []).map((c: any) => (
                    <option key={c.coa} value={c.coa}>{c.coa} - {c.nama_perkiraan}</option>
                  ))}
                </select>
              </div>

              {/* Rincian Items */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Rincian Belanja</span>
                  <button type="button" onClick={handleAddExpenseItem} className="text-xs text-teal-600 font-semibold hover:underline">
                    + Tambah Item
                  </button>
                </div>
                {expForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 bg-slate-50 rounded-xl">
                    <input
                      required
                      placeholder="Uraian"
                      value={item.keterangan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExpForm((prev) => {
                          const items = [...prev.items];
                          items[idx].keterangan = val;
                          return { ...prev, items };
                        });
                      }}
                      className="col-span-6 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setExpForm((prev) => {
                          const items = [...prev.items];
                          items[idx].qty = q;
                          items[idx].subtotal = q * items[idx].hargaSatuan;
                          return { ...prev, items };
                        });
                      }}
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Harga"
                      value={item.hargaSatuan || ''}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setExpForm((prev) => {
                          const items = [...prev.items];
                          items[idx].hargaSatuan = h;
                          items[idx].subtotal = items[idx].qty * h;
                          return { ...prev, items };
                        });
                      }}
                      className="col-span-4 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {expSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mutasi Antar Rekening */}
      {isTrfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Form Mutasi Kas & Antar Bank</h3>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transfer</label>
                <input
                  type="date"
                  required
                  value={trfForm.tglKirim}
                  onChange={(e) => setTrfForm({ ...trfForm, tglKirim: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Rekening Asal</label>
                <select
                  required
                  value={trfForm.dariRekeningId}
                  onChange={(e) => setTrfForm({ ...trfForm, dariRekeningId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Rekening Asal —</option>
                  {(bankAccounts || []).map((b: any) => (
                    <option key={b.id_rekening} value={b.id_rekening}>
                      {b.bank_nama || 'Bank'} - {b.keterangan} ({b.coa})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ke Rekening Tujuan</label>
                <select
                  required
                  value={trfForm.keRekeningId}
                  onChange={(e) => setTrfForm({ ...trfForm, keRekeningId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">— Pilih Rekening Tujuan —</option>
                  {(bankAccounts || []).map((b: any) => (
                    <option key={b.id_rekening} value={b.id_rekening}>
                      {b.bank_nama || 'Bank'} - {b.keterangan} ({b.coa})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Transfer (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={trfForm.jumlah || ''}
                    onChange={(e) => setTrfForm({ ...trfForm, jumlah: Number(e.target.value) })}
                    placeholder="1000000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biaya Transfer / Admin</label>
                  <input
                    type="number"
                    min="0"
                    value={trfForm.biayaTransfer}
                    onChange={(e) => setTrfForm({ ...trfForm, biayaTransfer: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTrfModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={trfSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {trfSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Eksekusi Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

