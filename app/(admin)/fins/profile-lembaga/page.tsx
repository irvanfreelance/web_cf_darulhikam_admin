"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Building2, Save, Upload, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { jsonFetcher } from '@/lib/json-client';

type ProfileData = {
  id?: number;
  ngo_name: string;
  address: string | null;
  legal_info: string | null;
  npwp: string | null;
  logo_url: string | null;
  email: string | null;
};

export default function ProfileLembagaPage() {
  const { data, error, isLoading, mutate } = useSWR<ProfileData>(
    '/api/fins/profile-lembaga',
    jsonFetcher
  );

  const [form, setForm] = useState<ProfileData>({
    ngo_name: '',
    address: '',
    legal_info: '',
    npwp: '',
    logo_url: '',
    email: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ngo_name: data.ngo_name || '',
        address: data.address || '',
        legal_info: data.legal_info || '',
        npwp: data.npwp || '',
        logo_url: data.logo_url || '',
        email: data.email || '',
      });
    }
  }, [data]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('Mengunggah logo...');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) throw new Error('Gagal mengunggah logo');
      const json = await res.json();
      setForm((prev) => ({ ...prev, logo_url: json.url }));
      toast.dismiss();
      toast.success('Logo berhasil diunggah');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Gagal mengunggah logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fins/profile-lembaga', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || errJson.errors?.[0]?.message || 'Gagal menyimpan profile');
      }

      await mutate();
      toast.success('Profil lembaga berhasil diperbarui');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl">
      <PageHeader
        title="Profile Lembaga"
        description="Identitas dan data resmi lembaga untuk kop laporan keuangan FINS"
      />

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error.message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo Lembaga */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Logo Lembaga
            </label>
            <div className="flex items-center gap-5">
              {form.logo_url ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                  <img
                    src={form.logo_url}
                    alt="Logo Lembaga"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                  <Building2 size={28} />
                </div>
              )}
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  {isUploading ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Upload size={16} />}
                  Unggah Logo Baru
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <p className="mt-1.5 text-xs text-slate-400">PNG, JPG, atau WEBP. Maks 2MB.</p>
              </div>
            </div>
          </div>

          {/* Nama Lembaga */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Nama Resmi Lembaga <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.ngo_name}
              onChange={(e) => setForm({ ...form, ngo_name: e.target.value })}
              placeholder="Contoh: LAZ Darul Hikam"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* NPWP & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                NPWP Lembaga
              </label>
              <input
                value={form.npwp || ''}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                placeholder="00.000.000.0-000.000"
                maxLength={30}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Email Resmi Lembaga
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="layanan@organisasi.org"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Alamat Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Alamat Kantor / Sekretariat
            </label>
            <textarea
              rows={3}
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Jalan, Nomor, Kelurahan, Kecamatan, Kota, Kode Pos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Legalitas / Izin Operasional */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Legalitas & Izin Operasional
            </label>
            <textarea
              rows={3}
              value={form.legal_info || ''}
              onChange={(e) => setForm({ ...form, legal_info: e.target.value })}
              placeholder="SK Kemenag, Akta Notaris, Izin Operasional Lembaga Amil Zakat"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

