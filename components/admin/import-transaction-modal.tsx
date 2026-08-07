"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, Download, UploadCloud, AlertCircle, 
  CheckCircle2, XCircle, RefreshCw, FileText, ArrowRight 
} from 'lucide-react';
import { formatIDR } from '@/lib/format';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ParsedRow {
  rowIndex: number;
  campaign_id: number;
  payment_method_id: number;
  donor_name_snapshot: string;
  donor_email?: string;
  donor_phone?: string;
  amount: number;
  qty: number;
  variant_id?: number | null;
  status: string;
  created_at?: string;
  is_anonymous: boolean;
  doa?: string;
  qurban_names: string[];
  affiliate_id?: number | null;
  isValid: boolean;
  errorReason?: string;
}

interface ImportTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportTransactionModalProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Result state after execution
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    successCount: number;
    failCount: number;
    errors: { rowIndex: number; reason: string }[];
  } | null>(null);

  // Reference data for client-side live validation
  const { data: campaigns } = useSWR<any[]>(
    isOpen ? '/api/campaigns?minimal=true&status=ACTIVE' : null,
    fetcher
  );

  const { data: paymentMethods } = useSWR<any[]>(
    isOpen ? '/api/payment-methods' : null,
    fetcher
  );

  // Reset modal state
  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setImportResult(null);
    setIsProcessingFile(false);
    setIsImporting(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  // Download template
  const handleDownloadTemplate = () => {
    window.open('/api/transactions/import/template', '_blank');
  };

  // Parse Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessingFile(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        // Target Sheet 1 (Import_Transaksi) or first sheet
        const sheetName = wb.SheetNames.includes('Import_Transaksi') 
          ? 'Import_Transaksi' 
          : wb.SheetNames[0];

        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          toast.error('File Excel kosong atau format tidak sesuai');
          setIsProcessingFile(false);
          return;
        }

        const validCampaignIds = new Set((campaigns ?? []).map(c => Number(c.id)));
        const validPmIds = new Set((paymentMethods ?? []).map(pm => Number(pm.id)));

        const parsed: ParsedRow[] = rawJson.map((row, idx) => {
          const rowIndex = idx + 2; // header is row 1
          
          const campaign_id = Number(row['Campaign ID'] || row['campaign_id'] || 0);
          const payment_method_id = Number(row['Payment Method ID'] || row['payment_method_id'] || 0);
          const donor_name_snapshot = String(row['Donor Name'] || row['donor_name_snapshot'] || '').trim();
          const donor_email = String(row['Donor Email'] || row['donor_email'] || '').trim();
          const donor_phone = String(row['Donor Phone'] || row['donor_phone'] || '').trim();
          const amount = Number(row['Amount'] || row['amount'] || 0);
          const qty = Math.max(1, Number(row['Qty'] || row['qty'] || 1));
          const variant_id = row['Variant ID'] || row['variant_id'] ? Number(row['Variant ID'] || row['variant_id']) : null;
          const status = String(row['Status'] || row['status'] || 'PAID').toUpperCase().trim();
          const created_at_raw = row['Transaction Date'] || row['created_at'];
          const is_anonymous_val = String(row['Is Anonymous'] || row['is_anonymous'] || '').toUpperCase().trim();
          const is_anonymous = is_anonymous_val === 'TRUE' || is_anonymous_val === '1' || is_anonymous_val === 'YA';
          const doa = String(row['Doa'] || row['doa'] || '').trim();
          
          const mudhohi_raw = row['Mudhohi Names'] || row['mudhohi_names'] || '';
          let qurban_names: string[] = [];
          if (Array.isArray(mudhohi_raw)) {
            qurban_names = mudhohi_raw.map((s: any) => String(s).trim()).filter(Boolean);
          } else if (typeof mudhohi_raw === 'string' && mudhohi_raw.trim()) {
            qurban_names = mudhohi_raw.split(',').map(s => s.trim()).filter(Boolean);
          }

          const affiliate_id = row['Affiliate ID'] || row['affiliate_id'] ? Number(row['Affiliate ID'] || row['affiliate_id']) : null;

          // Perform live validation checks
          let isValid = true;
          let errorReason = '';

          if (!campaign_id || !validCampaignIds.has(campaign_id)) {
            isValid = false;
            errorReason = `Campaign ID ${campaign_id || '(kosong)'} tidak valid / tidak ada di DB`;
          } else if (!payment_method_id || !validPmIds.has(payment_method_id)) {
            isValid = false;
            errorReason = `Payment Method ID ${payment_method_id || '(kosong)'} tidak valid / tidak ada di DB`;
          } else if (!donor_name_snapshot) {
            isValid = false;
            errorReason = 'Nama donatur wajib diisi';
          } else if (!amount || amount <= 0) {
            isValid = false;
            errorReason = 'Nominal amount harus lebih dari 0';
          } else if (!['PAID', 'PENDING', 'EXPIRED', 'CANCELLED'].includes(status)) {
            isValid = false;
            errorReason = `Status '${status}' tidak valid (Gunakan PAID, PENDING, EXPIRED, CANCELLED)`;
          }

          let created_at: string | undefined = undefined;
          if (created_at_raw) {
            const dt = new Date(created_at_raw);
            if (!isNaN(dt.getTime())) {
              created_at = dt.toISOString();
            }
          }

          return {
            rowIndex,
            campaign_id,
            payment_method_id,
            donor_name_snapshot,
            donor_email: donor_email || undefined,
            donor_phone: donor_phone || undefined,
            amount,
            qty,
            variant_id,
            status,
            created_at,
            is_anonymous,
            doa: doa || undefined,
            qurban_names,
            affiliate_id,
            isValid,
            errorReason,
          };
        });

        setParsedRows(parsed);
        toast.success(`Berhasil membaca ${parsed.length} baris data dari Excel`);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        toast.error('Gagal membaca file Excel. Pastikan format file benar.');
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit valid rows for bulk import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('Tidak ada baris data valid yang siap di-import');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.errors?.[0]?.message || 'Gagal mengeksekusi import transaksi');
      }

      setImportResult({
        totalRows: parsedRows.length,
        successCount: data.successCount,
        failCount: data.failCount,
        errors: data.errors || [],
      });

      toast.success(`Import selesai! ${data.successCount} baris berhasil ter-input.`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Import Transaksi via Excel"
      description="Download template Excel ber-referensi DB, unggah file, dan pratinjau sebelum impor."
      maxWidth="2xl"
    >
      <div className="space-y-6">

        {/* ── Top Download Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-900">Belum punya format Excel?</h4>
              <p className="text-xs text-indigo-700 font-normal mt-0.5">
                Download template resmi multi-sheet berisikan ID Kampanye &amp; Payment Method terbaru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-all shadow-sm shrink-0"
          >
            <Download size={14} /> Download Template Excel
          </button>
        </div>

        {/* ── Post Import Result View (if finished) ── */}
        {importResult ? (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={28} className="text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Import Massal Selesai</h3>
                  <p className="text-xs text-emerald-700 font-normal">
                    {importResult.successCount} dari {importResult.totalRows} baris transaksi berhasil di-input ke database.
                  </p>
                </div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle size={16} className="text-rose-600" /> Detail Baris Gagal ({importResult.failCount})
                  </h4>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-xs text-rose-800 bg-white p-2.5 rounded-xl border border-rose-200/60 font-mono flex items-start gap-2">
                      <span className="font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">Baris {err.rowIndex}</span>
                      <span>{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
              >
                <RefreshCw size={15} /> Upload File Lain
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-indigo-500/20 shadow-md"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Upload & Preview View ── */
          <div className="space-y-6">
            
            {/* Upload Zone */}
            <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50 hover:bg-indigo-50/30 group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-white group-hover:bg-indigo-600 text-slate-400 group-hover:text-white rounded-2xl shadow-sm transition-all">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {fileName ? fileName : 'Pilih atau Tarik File Excel di sini'}
                  </p>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Mendukung format file .XLSX, .XLS, atau .CSV
                  </p>
                </div>
              </div>
            </div>

            {/* Processing Indicator */}
            {isProcessingFile && (
              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                <RefreshCw size={16} className="animate-spin" /> Membaca dan memvalidasi baris data...
              </div>
            )}

            {/* Parsed Preview Section */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                
                {/* Summary Banner */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/80 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Baris</p>
                    <p className="text-lg font-bold text-slate-800">{parsedRows.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Siap Import (Valid)</p>
                    <p className="text-lg font-bold text-emerald-700">{validCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Error / Invalid</p>
                    <p className="text-lg font-bold text-rose-700">{invalidCount}</p>
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText size={15} /> Pratinjau Baris Data Excel
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400">
                      Menampilkan {parsedRows.length} baris
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/60 text-slate-500 font-bold border-b border-slate-100">
                          <th className="py-2.5 px-3 text-center">#</th>
                          <th className="py-2.5 px-3">Kampanye ID</th>
                          <th className="py-2.5 px-3">Donatur</th>
                          <th className="py-2.5 px-3 text-right">Nominal</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row) => (
                          <tr key={row.rowIndex} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'}>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              {row.rowIndex}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              ID {row.campaign_id}
                              {campaigns?.find(c => Number(c.id) === row.campaign_id) && (
                                <span className="block text-[10px] text-slate-400 line-clamp-1 font-normal">
                                  {campaigns.find(c => Number(c.id) === row.campaign_id)?.title}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800">{row.donor_name_snapshot}</p>
                              {row.donor_phone && <p className="text-[10px] text-slate-400 font-mono">{row.donor_phone}</p>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatIDR(row.amount)}
                              {row.qty > 1 && <span className="block text-[10px] text-slate-400">Qty: {row.qty}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${row.status === 'PAID' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={12} /> Valid
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full cursor-help"
                                  title={row.errorReason}
                                >
                                  <AlertCircle size={12} /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    {validCount} baris valid siap di-import
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      disabled={isImporting}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting || validCount === 0}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-indigo-500/20 shadow-md disabled:opacity-50"
                    >
                      {isImporting ? 'Meng-import...' : `Konfirmasi Import (${validCount} Baris)`}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
