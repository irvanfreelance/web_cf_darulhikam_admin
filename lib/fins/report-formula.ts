import { TrialBalanceRow } from './trial-balance';

/**
 * Evaluates an account code or formula from fins_report against the Trial Balance rows.
 * E.g., '101.00.000.000' matches all leaf COAs starting with '101'.
 */
export function evaluateReportRow(
  coaPattern: string | null | undefined,
  tbRows: TrialBalanceRow[]
): { debet: number; kredit: number; netto: number } {
  if (!coaPattern || coaPattern.trim() === '') {
    return { debet: 0, kredit: 0, netto: 0 };
  }

  const prefix = coaPattern.trim().replace(/(\.000)+$/, '');

  let debet = 0;
  let kredit = 0;

  for (const r of tbRows) {
    if (r.coa.startsWith(prefix)) {
      debet += r.akDebet;
      kredit += r.akKredit;
    }
  }

  return {
    debet,
    kredit,
    netto: debet - kredit,
  };
}

