"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Modal } from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { 
  User, Calendar, CreditCard, DollarSign, MessageSquare, 
  Plus, Trash2, Heart, Award, CheckCircle2, UserCheck
} from 'lucide-react';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any | null; // If passed, modal is in Edit mode
}

export function ManualTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  editData = null,
}: ManualTransactionModalProps) {
  const isEdit = Boolean(editData);

  // Form State
  const [selectedDonorId, setSelectedDonorId] = useState<string | number>('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [campaignId, setCampaignId] = useState<string | number>('');
  const [variantId, setVariantId] = useState<string | number>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string | number>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [qty, setQty] = useState<number>(1);
  const [createdAt, setCreatedAt] = useState('');
  const [status, setStatus] = useState('PAID');
  const [doa, setDoa] = useState('');
  const [affiliateId, setAffiliateId] = useState<string | number>('');
  const [qurbanNames, setQurbanNames] = useState<string[]>(['']);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data Options
  const { data: campaignList } = useSWR<any[]>(
    isOpen ? '/api/campaigns?minimal=true&status=ACTIVE' : null,
    fetcher
  );

  const { data: donorList } = useSWR<any[]>(
    isOpen ? '/api/donors?limit=100' : null,
    fetcher
  );

  const { data: paymentMethods } = useSWR<any[]>(
    isOpen ? '/api/payment-methods' : null,
    fetcher
  );

  const { data: affiliateList } = useSWR<any[]>(
    isOpen ? '/api/affiliates?limit=1000' : null,
    fetcher
  );

  // Detail selected campaign (to check flags & variants)
  const { data: campaignDetail } = useSWR<any>(
    campaignId ? `/api/campaigns/${campaignId}` : null,
    fetcher
  );

  // Initialize/Reset form data
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // Fetch full detail if editing via invoice_code
        fetch(`/api/transactions/${editData.invoice_code}`)
          .then(res => res.json())
          .then(detail => {
            setSelectedDonorId(detail.donor_id || '');
            setDonorName(detail.donor_name_snapshot || detail.donor_name || '');
            setDonorEmail(detail.donor_email || '');
            setDonorPhone(detail.donor_phone || '');
            setIsAnonymous(detail.is_anonymous ?? false);

            setCampaignId(detail.campaign_id || detail.campaigns?.[0]?.id || '');
            setVariantId(detail.variant_id || '');
            setPaymentMethodId(detail.payment_method_id || '');
            setAmount(detail.total_amount || detail.transaction_amount || '');
            setQty(detail.transaction_qty || detail.qty || 1);
            setStatus(detail.status || 'PAID');
            setDoa(detail.doa || '');
            setAffiliateId(detail.affiliate_id || '');

            if (detail.created_at) {
              const dt = new Date(detail.created_at);
              const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
              setCreatedAt(localIso);
            }

            if (detail.qurban_names && detail.qurban_names.length > 0) {
              setQurbanNames(detail.qurban_names.map((q: any) => q.mudhohi_name));
            } else {
              setQurbanNames(['']);
            }
          })
          .catch(err => {
            console.error('Error loading edit transaction detail:', err);
          });
      } else {
        // Reset form for Create
        setSelectedDonorId('');
        setDonorName('');
        setDonorEmail('');
        setDonorPhone('');
        setIsAnonymous(false);

        setCampaignId('');
        setVariantId('');
        setPaymentMethodId('');
        setAmount('');
        setQty(1);
        setStatus('PAID');
        setDoa('');
        setAffiliateId('');
        setQurbanNames(['']);

        // Default to current local time
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString().slice(0, 16);
        setCreatedAt(localIso);
      }
    }
  }, [isOpen, editData]);

  // Handle donor selection change
  const handleDonorSelect = (val: string | number) => {
    setSelectedDonorId(val);
    if (!val || val === 'NEW') {
      // Keep input editable for new donor
      return;
    }
    const donor = (donorList ?? []).find(d => String(d.id) === String(val));
    if (donor) {
      setDonorName(donor.name || '');
      setDonorEmail(donor.email || '');
      setDonorPhone(donor.phone || '');
    }
  };

  // Handle campaign selection change
  const handleCampaignSelect = (val: string | number) => {
    setCampaignId(val);
    setVariantId('');
    setQurbanNames(['']);
  };

  // Handle variant selection change
  const handleVariantSelect = (val: string | number) => {
    setVariantId(val);
    if (val && campaignDetail?.variants) {
      const v = campaignDetail.variants.find((v: any) => String(v.id) === String(val));
      if (v) {
        setAmount(v.price * qty);
      }
    }
  };

  // Adjust qurban names array size when qty changes
  const handleQtyChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQty(validQty);

    if (campaignDetail?.is_qurban) {
      setQurbanNames(prev => {
        const next = [...prev];
        while (next.length < validQty) next.push('');
        return next.slice(0, validQty);
      });
    }

    if (variantId && campaignDetail?.variants) {
      const v = campaignDetail.variants.find((v: any) => String(v.id) === String(variantId));
      if (v) setAmount(v.price * validQty);
    }
  };

  // Add / remove Qurban Mudhohi name
  const handleQurbanNameChange = (index: number, val: string) => {
    setQurbanNames(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const addQurbanNameRow = () => {
    setQurbanNames(prev => [...prev, '']);
  };

  const removeQurbanNameRow = (index: number) => {
    setQurbanNames(prev => prev.filter((_, i) => i !== index));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorName.trim()) {
      toast.error('Nama donatur wajib diisi');
      return;
    }
    if (!campaignId) {
      toast.error('Pilih kampanye terlebih dahulu');
      return;
    }
    if (!paymentMethodId) {
      toast.error('Pilih metode pembayaran');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Masukkan nominal transaksi yang valid');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        campaign_id: Number(campaignId),
        created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        payment_method_id: Number(paymentMethodId),
        amount: Number(amount),
        donor_id: selectedDonorId && selectedDonorId !== 'NEW' ? Number(selectedDonorId) : null,
        donor_name_snapshot: donorName.trim(),
        donor_email: donorEmail.trim() || null,
        donor_phone: donorPhone.trim() || null,
        is_anonymous: isAnonymous,
        status,
        doa: doa.trim() || null,
        affiliate_id: affiliateId ? Number(affiliateId) : null,
        variant_id: variantId ? Number(variantId) : null,
        qty,
        qurban_names: campaignDetail?.is_qurban ? qurbanNames.filter(n => n.trim() !== '') : [],
      };

      let res;
      if (isEdit && editData) {
        payload.id = editData.id;
        payload.created_at = editData.created_at;
        res = await fetch('/api/transactions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || resData.errors?.[0]?.message || 'Gagal menyimpan transaksi');
      }

      toast.success(isEdit ? 'Transaksi berhasil diperbarui' : 'Transaksi manual berhasil ditambahkan');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Transaksi Manual' : 'Tambah Transaksi Manual'}
      description="Kelola transaksi manual, pilih kampanye, isian kustom, dan identifikasi donatur."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 1. Donatur Picker & Autofill ── */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Data Donatur
            </h4>
            {selectedDonorId && selectedDonorId !== 'NEW' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck size={12} /> Donatur Terdaftar
              </span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Cari / Pilih Donatur Eksisting (Anti-Redudan)
            </label>
            <SearchableSelect
              value={selectedDonorId}
              onChange={handleDonorSelect}
              placeholder="Donatur Baru (Ketik Manual)"
              options={[
                { id: '', name: 'Donatur Baru (Ketik Manual)' },
                ...(donorList ?? []).map((d: any) => ({
                  id: d.id,
                  name: `${d.name} ${d.phone ? `(${d.phone})` : ''} ${d.email ? `- ${d.email}` : ''}`
                }))
              ]}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Nama Lengkap Donatur <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nama donatur..."
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                No. WhatsApp / HP
              </label>
              <input
                type="text"
                placeholder="081234567890"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Email Donatur
              </label>
              <input
                type="email"
                placeholder="donatur@gmail.com"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Donatur Anonim (Hamba Allah)</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── 2. Kampanye & Custom Isian ── */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
            <Heart size={16} className="text-indigo-600" /> Detail Kampanye &amp; Isian Kustom
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
              Pilih Kampanye <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={campaignId}
              onChange={handleCampaignSelect}
              placeholder="Cari & Pilih Kampanye..."
              options={(campaignList ?? []).map((c: any) => ({ id: c.id, name: c.title }))}
              className="h-11"
            />
          </div>

          {/* Dynamic Badge per Campaign Type */}
          {campaignDetail && (
            <div className="flex flex-wrap gap-2 pt-1">
              {campaignDetail.is_qurban && (
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                  Jenis: Qurban
                </span>
              )}
              {campaignDetail.is_zakat && (
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                  Jenis: Zakat
                </span>
              )}
              {campaignDetail.variants && campaignDetail.variants.length > 0 && (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full border border-indigo-200">
                  {campaignDetail.variants.length} Varian Tersedia
                </span>
              )}
            </div>
          )}

          {/* Varian Selection (if campaign has variants) */}
          {campaignDetail?.variants && campaignDetail.variants.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                Pilih Varian Paket / Barang
              </label>
              <select
                value={variantId}
                onChange={(e) => handleVariantSelect(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all h-11"
              >
                <option value="">-- Tanpa Varian Specific --</option>
                {campaignDetail.variants.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name} - {formatIDR(v.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Qurban Custom Field: Mudhohi Names */}
          {campaignDetail?.is_qurban && (
            <div className="space-y-3 pt-2 bg-amber-50/70 p-4 rounded-xl border border-amber-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Award size={15} className="text-amber-600" /> Nama Mudhohi (Orang yang Berkurban)
                </label>
                <button
                  type="button"
                  onClick={addQurbanNameRow}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-200/50 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all"
                >
                  <Plus size={13} /> Tambah Nama
                </button>
              </div>

              {qurbanNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 w-5 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder={`Nama Mudhohi ${idx + 1}...`}
                    value={name}
                    onChange={(e) => handleQurbanNameChange(idx, e.target.value)}
                    className="flex-1 bg-white border border-amber-200 rounded-xl py-2 px-3.5 text-sm text-slate-900 focus:border-amber-500 outline-none"
                  />
                  {qurbanNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQurbanNameRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Transaksi & Nominal ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                required
                min={1000}
                placeholder="100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
            </div>
            {amount !== '' && Number(amount) > 0 && (
              <p className="text-[11px] text-emerald-600 font-bold mt-1">
                Formatted: {formatIDR(Number(amount))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Jumlah (Qty)
            </label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => handleQtyChange(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
        </div>

        {/* ── 4. Metode Pembayaran & Tanggal ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Metode Pembayaran <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={paymentMethodId}
              onChange={(val) => setPaymentMethodId(val)}
              placeholder="Pilih Metode Pembayaran..."
              options={(paymentMethods ?? []).map((pm: any) => ({ id: pm.id, name: `${pm.name} (${pm.code})` }))}
              className="h-11"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Waktu Transaksi (Tanggal &amp; Jam)
            </label>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-900 focus:border-indigo-500 outline-none transition-all h-11"
            />
          </div>
        </div>

        {/* ── 5. Status & Affiliate ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Status Pembayaran
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all h-11"
            >
              <option value="PAID">Lunas (PAID)</option>
              <option value="PENDING">Pending (PENDING)</option>
              <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
              <option value="CANCELLED">Batal (CANCELLED)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Affiliate / Fundraiser (Opsional)
            </label>
            <SearchableSelect
              value={affiliateId}
              onChange={(val) => setAffiliateId(val)}
              placeholder="Tanpa Affiliate"
              options={[
                { id: '', name: 'Tanpa Affiliate' },
                ...(affiliateList ?? []).map((a: any) => ({ id: a.id, name: `${a.name} (${a.affiliate_code})` }))
              ]}
              className="h-11"
            />
          </div>
        </div>

        {/* ── 6. Doa / Catatan ── */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
            Doa / Catatan Donatur (Opsional)
          </label>
          <textarea
            rows={2}
            placeholder="Tuliskan doa atau pesan donatur..."
            value={doa}
            onChange={(e) => setDoa(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-900 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-indigo-500/20 shadow-lg disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
