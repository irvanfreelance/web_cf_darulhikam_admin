"use client";

export function PrintButton({ label = 'Cetak / simpan PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm text-white print:hidden">
      {label}
    </button>
  );
}
