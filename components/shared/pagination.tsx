import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  offset: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  offset,
  limit,
  onPageChange,
  onLimitChange,
  isLoading
}: PaginationProps) {
  const pageNumbers = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <p className="text-xs font-semibold text-slate-400">
          Menampilkan <span className="text-slate-800 font-medium">{Math.min(offset + 1, totalCount)}</span> - <span className="text-slate-800 font-medium">{Math.min(offset + limit, totalCount)}</span> dari <span className="text-slate-800 font-medium">{totalCount}</span> data
        </p>
        
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Baris:</span>
            <select 
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-slate-100 rounded-lg text-[11px] font-medium text-slate-700 px-2 py-1 focus:outline-none focus:border-teal-500/50 transition-all shadow-sm cursor-pointer"
            >
              {[10, 20, 50, 100].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex gap-1 mr-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1 || isLoading}
            onClick={() => onPageChange(1)}
            className="rounded-xl w-8 h-8 p-0 border-slate-100 bg-white text-slate-400 hover:text-slate-800 transition-all hover:bg-slate-50"
            title="Halaman Pertama"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded-xl w-8 h-8 p-0 border-slate-100 bg-white text-slate-400 hover:text-slate-800 transition-all hover:bg-slate-50"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
          </Button>
        </div>

        <div className="flex gap-1">
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "secondary" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "w-8 h-8 rounded-xl p-0 text-[11px] font-medium transition-all border",
                currentPage === pageNum 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-110 z-10" 
                  : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
              )}
            >
              {pageNum}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 ml-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded-xl w-8 h-8 p-0 border-slate-100 bg-white text-slate-400 hover:text-slate-800 transition-all hover:bg-slate-50"
            title="Halaman Selanjutnya"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(totalPages)}
            className="rounded-xl w-8 h-8 p-0 border-slate-100 bg-white text-slate-400 hover:text-slate-800 transition-all hover:bg-slate-50"
            title="Halaman Terakhir"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
