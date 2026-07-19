"use client";

import * as React from "react"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  id: string | number;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Pilih opsi...",
  className,
  disabled
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-900 transition-all focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "border-teal-500/50 ring-4 ring-teal-500/5"
        )}
      >
        <span className={cn("truncate font-medium", !selectedOption && "text-slate-400 font-normal")}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-[110] mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-xl border border-slate-100 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-50 p-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                className="w-full text-sm outline-none placeholder:text-slate-400 bg-transparent text-slate-700"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}>
                  <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors text-left",
                      String(opt.id) === String(value)
                        ? "bg-teal-50 text-teal-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate">{opt.name}</span>
                    {String(opt.id) === String(value) && <Check className="h-4 w-4 text-teal-600" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-xs text-slate-400 font-bold italic">
                  Opsi tidak ditemukan...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
