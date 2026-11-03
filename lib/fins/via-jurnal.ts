/**
 * Maps mutasi code to via_jurnal code based on 03_fins_triggers.md:
 * - '2', '4' -> 1
 * - 'e' -> 2
 * - '1', '3', '6', '10' -> 3
 * - other -> 0
 */
export function getViaJurnal(mutasi?: string | null): number {
  if (!mutasi) return 0;
  const m = String(mutasi).trim().toLowerCase();
  if (m === '2' || m === '4') return 1;
  if (m === 'e') return 2;
  if (['1', '3', '6', '10'].includes(m)) return 3;
  return 0;
}

