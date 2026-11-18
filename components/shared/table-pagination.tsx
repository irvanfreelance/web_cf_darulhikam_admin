'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface TablePaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (nextPage: number) => void;
  exportData?: Record<string, unknown>[];
  exportFilename?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export function TablePagination({
  page,
  total,
  pageSize = 10,
  onPageChange,
  exportData,
  exportFilename = 'export.xlsx',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleExport = () => {
    if (!exportData || exportData.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, exportFilename);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue ?? ''}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              placeholder={searchPlaceholder}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
            />
          </div>
        )}
        <span>
          Menampilkan halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> ({total} data)
        </span>
        {exportData && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Berikutnya
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

