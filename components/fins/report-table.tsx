import { formatIDR } from '@/lib/format';

export interface ReportRowData {
  id: number;
  namaCoa: string;
  level: number;
  coa: string;
  kode: string;
  keterangan: string;
  isHeader: boolean;
  nilaiBerjalan: number | null;
  nilaiPembanding: number | null;
}

interface ReportTableProps {
  rows: ReportRowData[];
  periodeBerjalanLabel: string;
  periodePembandingLabel: string;
  isLoading?: boolean;
}

export function ReportTable({
  rows,
  periodeBerjalanLabel,
  periodePembandingLabel,
  isLoading,
}: ReportTableProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Mengevaluasi rumus laporan keuangan...
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Tidak ada data baris pos laporan yang ditemukan.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-slate-700 font-semibold print:bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left w-12 print:hidden">Kode</th>
            <th className="px-4 py-3 text-left">Pos / Akun</th>
            <th className="px-4 py-3 text-right w-44">{periodeBerjalanLabel}</th>
            <th className="px-4 py-3 text-right w-44">{periodePembandingLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const isBold =
              row.isHeader ||
              row.level === 1 ||
              row.namaCoa.includes('<b>') ||
              row.kode?.startsWith('TOTAL') ||
              row.kode?.startsWith('SURPLUS');

            const indentClass =
              row.level === 1
                ? 'pl-4'
                : row.level === 2
                ? 'pl-8'
                : row.level === 3
                ? 'pl-12'
                : 'pl-16';

            // Bersihkan tag HTML sederhana seperti <b> bila ada untuk rendering
            const cleanTitle = row.namaCoa.replace(/<\/?b>/gi, '');

            return (
              <tr
                key={row.id}
                className={
                  row.isHeader
                    ? 'bg-slate-50/75 print:bg-transparent font-bold text-slate-900'
                    : isBold
                    ? 'font-semibold text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50/50'
                }
              >
                <td className="px-4 py-2 font-mono text-xs text-slate-400 print:hidden">
                  {row.kode || '-'}
                </td>
                <td className={`py-2 pr-4 ${indentClass}`}>
                  <div className="flex items-center gap-2">
                    <span className={isBold ? 'font-bold' : ''}>{cleanTitle}</span>
                    {row.coa && (
                      <span className="text-[11px] font-mono text-slate-400 print:hidden">
                        ({row.coa})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-mono whitespace-nowrap">
                  {row.nilaiBerjalan === null ? (
                    ''
                  ) : (
                    <span
                      className={
                        row.nilaiBerjalan < 0
                          ? 'text-rose-600 font-semibold'
                          : isBold
                          ? 'font-bold text-slate-900'
                          : 'text-slate-800'
                      }
                    >
                      {row.nilaiBerjalan < 0
                        ? `(${formatIDR(Math.abs(row.nilaiBerjalan))})`
                        : formatIDR(row.nilaiBerjalan)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono whitespace-nowrap text-slate-500">
                  {row.nilaiPembanding === null ? (
                    ''
                  ) : (
                    <span className={row.nilaiPembanding < 0 ? 'text-rose-600' : ''}>
                      {row.nilaiPembanding < 0
                        ? `(${formatIDR(Math.abs(row.nilaiPembanding))})`
                        : formatIDR(row.nilaiPembanding)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
