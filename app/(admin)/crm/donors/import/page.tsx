"use client";

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ChevronLeft, Download, Loader2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { donorImportRowSchema, mapSheetRow } from '@/lib/crm/donor-schema';
import { sendJson } from '@/lib/json-client';

type PreviewRow = {
  rowIndex: number;
  name: string;
  email: string;
  phone: string;
  payload: Record<string, unknown> | null;
  valid: boolean;
  reason: string;
};

function cellText(row: PreviewRow) {
  return row.reason || 'Siap dimasukkan';
}

export default function ImportDonorsPage() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importingRef = useRef(false);
  const [result, setResult] = useState<{ inserted: number; rejected: { rowIndex: number; reason: string }[] } | null>(null);

  const validCount = useMemo(() => rows.filter((row) => row.valid).length, [rows]);

  const downloadTemplate = () => {
    const sample = [{
      nama: 'Siti Aminah',
      email: 'siti@example.com',
      telepon: '081234567890',
      jenis: 'perorangan',
      jenis_kelamin: 'P',
      alamat: 'Jl. Contoh No. 1',
      nik: '3201010101010001',
      status_aktif: 'ya',
      kantor_id: '',
      tim_crm_id: '',
      minat_program: 'Zakat',
    }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(sample), 'Donatur');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ['Kolom NIK harus berformat teks sebelum diisi agar 16 digit tidak berubah.'],
      ['jenis: perorangan, perusahaan, komunitas'],
      ['jenis_kelamin: L atau P'],
      ['status_aktif: ya atau tidak'],
      ['Baris yang email, telepon, atau NIK-nya sudah ada akan ditolak. Data lama tidak diubah.'],
      ['Maksimal 500 baris.'],
    ]), 'Petunjuk');
    XLSX.writeFile(book, 'template-impor-donatur.xlsx');
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setIsReading(true);
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      if (rawRows.length === 0) {
        toast.error('Berkas kosong');
        setRows([]);
        return;
      }
      if (rawRows.length > 500) {
        toast.error('Maksimal 500 baris');
        setRows([]);
        return;
      }
      const seenEmail = new Set<string>();
      const seenPhone = new Set<string>();
      const seenNik = new Set<string>();
      const preview: PreviewRow[] = rawRows.map((raw, index) => {
        const mapped = mapSheetRow(raw, index + 2);
        const checked = donorImportRowSchema.safeParse(mapped);
        if (!checked.success) {
          return {
            rowIndex: index + 2,
            name: String(mapped.name || ''),
            email: String(mapped.email || ''),
            phone: String(mapped.phone || ''),
            payload: null,
            valid: false,
            reason: checked.error.issues.map((issue) => issue.message).join('; '),
          };
        }
        const emailKey = checked.data.email?.toLowerCase() || '';
        let reason = '';
        if (emailKey && seenEmail.has(emailKey)) reason = 'Email dobel di dalam berkas';
        else if (checked.data.phone && seenPhone.has(checked.data.phone)) reason = 'Telepon dobel di dalam berkas';
        else if (checked.data.nik && seenNik.has(checked.data.nik)) reason = 'NIK dobel di dalam berkas';
        if (emailKey) seenEmail.add(emailKey);
        if (checked.data.phone) seenPhone.add(checked.data.phone);
        if (checked.data.nik) seenNik.add(checked.data.nik);
        return {
          rowIndex: checked.data.rowIndex,
          name: checked.data.name,
          email: checked.data.email || '',
          phone: checked.data.phone || '',
          payload: reason ? null : mapped,
          valid: !reason,
          reason,
        };
      });
      setRows(preview);
      toast.success(`${preview.filter((row) => row.valid).length} baris lolos pratinjau`);
    } catch (error: any) {
      toast.error(error.message || 'Berkas tidak bisa dibaca');
    } finally {
      setIsReading(false);
    }
  };

  const submit = async () => {
    if (importingRef.current) return;
    const payload = rows.filter((row) => row.valid && row.payload).map((row) => row.payload);
    if (!payload.length) return;
    importingRef.current = true;
    setIsImporting(true);
    try {
      const response = await sendJson('/api/crm/donors/import', 'POST', { rows: payload });
      setResult(response);
      const reasons = new Map<number, string>(
        (response.rejected ?? []).map((item: { rowIndex: number; reason: string }) => [item.rowIndex, item.reason])
      );
      setRows((current) => current.map((row) => {
        if (reasons.has(row.rowIndex)) {
          return { ...row, valid: false, payload: null, reason: reasons.get(row.rowIndex) || row.reason };
        }
        if (row.valid) return { ...row, valid: false, payload: null, reason: 'Sudah dimasukkan' };
        return row;
      }));
      toast.success(`${response.inserted} donatur baru ditambahkan`);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal mengimpor donatur');
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <Link href="/crm/donors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Kembali ke data donatur
      </Link>
      <PageHeader title="Impor donatur" description="CSV atau XLSX. Pratinjau dulu, lalu masukkan hanya baris yang lolos. Baris yang sudah ada tidak diubah.">
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <Download size={16} /> Template
        </button>
      </PageHeader>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
        <label className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-500">
          <Upload size={20} />
          <span>{fileName || 'Pilih berkas CSV atau XLSX'}</span>
          <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="sr-only" onChange={onFile} />
        </label>
        {isReading && <p className="mt-3 text-center text-xs text-slate-400">Membaca berkas...</p>}
      </div>

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
            <span>{validCount} valid · {rows.length - validCount} ditolak di pratinjau</span>
            <button
              type="button"
              disabled={!validCount || isImporting}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : null}
              Masukkan {validCount} baris valid
            </button>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Baris</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Telepon</th>
                  <th className="px-4 py-3 font-medium">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowIndex} className="border-t border-slate-50">
                    <td className="px-4 py-3 text-slate-400">{row.rowIndex}</td>
                    <td className="px-4 py-3">{row.name || '—'}</td>
                    <td className="px-4 py-3">{row.email || '—'}</td>
                    <td className="px-4 py-3">{row.phone || '—'}</td>
                    <td className={`px-4 py-3 ${row.valid ? 'text-emerald-600' : 'text-rose-600'}`}>{cellText(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          {result.inserted} baris baru tersimpan. {result.rejected.length} baris ditolak server dan tidak mengubah data lama.
        </div>
      )}
    </div>
  );
}
