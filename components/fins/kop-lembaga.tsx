'use client';

import useSWR from 'swr';
import Image from 'next/image';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface KopLembagaProps {
  title?: string;
  subtitle?: string;
  periodeLabel?: string;
}

export function KopLembaga({ title, subtitle, periodeLabel }: KopLembagaProps) {
  const { data: profile } = useSWR('/api/fins/profile-lembaga', fetcher);

  const nama = profile?.nama_lembaga || 'LAZ DARUL HIKAM';
  const alamat = profile?.alamat || 'Jl. Tubagus Ismail No. 46, Kota Bandung, Jawa Barat';
  const telepon = profile?.telepon || '(022) 2503456';
  const email = profile?.email || 'laz@darulhikam.sch.id';
  const npwp = profile?.npwp || '01.234.567.8-428.000';
  const logo = profile?.logo_url;

  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt={nama} className="h-16 w-16 object-contain" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-2xl shadow-sm print:border print:border-black">
              DH
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {nama}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{alamat}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Telp: {telepon} | Email: {email} | NPWP: {npwp}
            </p>
          </div>
        </div>

        <div className="text-right">
          {title && (
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
          {periodeLabel && (
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 print:border-none">
              {periodeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

