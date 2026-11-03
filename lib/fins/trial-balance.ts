import { query } from '@/lib/db';
import { getSaldoAwal } from './saldo';

export type TrialBalanceRow = {
  coa: string;
  nama_perkiraan: string;
  saldo: 'd' | 'k';
  parent: 'y' | 'n';
  saDebet: number;
  saKredit: number;
  mutDebet: number;
  mutKredit: number;
  adjDebet: number;
  adjKredit: number;
  akDebet: number;
  akKredit: number;
};

export type TrialBalanceSummary = {
  totSaDebet: number;
  totSaKredit: number;
  totMutDebet: number;
  totMutKredit: number;
  totAdjDebet: number;
  totAdjKredit: number;
  totAkDebet: number;
  totAkKredit: number;
  isBalanced: boolean;
};

/**
 * Calculates Trial Balance for all active COA within a given period or date range.
 */
export async function getTrialBalance(
  client: any,
  options: {
    periodeFrom: string;
    periodeTo: string;
    idKantor?: number | null;
  }
): Promise<{ rows: TrialBalanceRow[]; summary: TrialBalanceSummary }> {
  const { periodeFrom, periodeTo, idKantor } = options;

  // 1. Ambil seluruh akun COA
  const coaRes = await client.query(
    `SELECT coa, nama_coa AS nama_perkiraan, saldo, parent
     FROM fins_coa
     WHERE active = 'y'
     ORDER BY coa ASC`
  );

  const rows: TrialBalanceRow[] = [];

  let totSaDebet = 0;
  let totSaKredit = 0;
  let totMutDebet = 0;
  let totMutKredit = 0;
  let totAdjDebet = 0;
  let totAdjKredit = 0;
  let totAkDebet = 0;
  let totAkKredit = 0;

  for (const c of coaRes.rows) {
    if (c.parent === 'y') continue; // Hanya akun daun

    // Saldo awal
    const { saldoAwal } = await getSaldoAwal(client, c.coa, periodeFrom, idKantor);
    const saDebet = c.saldo === 'd' ? Math.max(0, saldoAwal) : 0;
    const saKredit = c.saldo === 'k' ? Math.max(0, saldoAwal) : 0;

    // Mutasi biasa & penyesuaian
    const mutRes = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN j.fins_trans_id NOT IN (SELECT fins_trans_id FROM period_adjusting_entries WHERE fins_trans_id IS NOT NULL) THEN j.debet ELSE 0 END), 0)::numeric AS mut_debet,
         COALESCE(SUM(CASE WHEN j.fins_trans_id NOT IN (SELECT fins_trans_id FROM period_adjusting_entries WHERE fins_trans_id IS NOT NULL) THEN j.kredit ELSE 0 END), 0)::numeric AS mut_kredit,
         COALESCE(SUM(CASE WHEN j.fins_trans_id IN (SELECT fins_trans_id FROM period_adjusting_entries WHERE fins_trans_id IS NOT NULL) THEN j.debet ELSE 0 END), 0)::numeric AS adj_debet,
         COALESCE(SUM(CASE WHEN j.fins_trans_id IN (SELECT fins_trans_id FROM period_adjusting_entries WHERE fins_trans_id IS NOT NULL) THEN j.kredit ELSE 0 END), 0)::numeric AS adj_kredit
       FROM fins_jurnal j
       WHERE j.coa = $1 AND j.tgl_exre >= $2 AND j.tgl_exre <= $3
       ${idKantor ? `AND j.id_kantor = $4` : ''}`,
      idKantor ? [c.coa, periodeFrom, periodeTo, idKantor] : [c.coa, periodeFrom, periodeTo]
    );

    const mutDebet = Number(mutRes.rows[0]?.mut_debet || 0);
    const mutKredit = Number(mutRes.rows[0]?.mut_kredit || 0);
    const adjDebet = Number(mutRes.rows[0]?.adj_debet || 0);
    const adjKredit = Number(mutRes.rows[0]?.adj_kredit || 0);

    // Saldo Akhir
    let saldoAkhir = 0;
    if (c.saldo === 'd') {
      saldoAkhir = (saDebet - saKredit) + (mutDebet + adjDebet) - (mutKredit + adjKredit);
    } else {
      saldoAkhir = (saKredit - saDebet) + (mutKredit + adjKredit) - (mutDebet + adjDebet);
    }

    const akDebet = c.saldo === 'd' ? Math.max(0, saldoAkhir) : 0;
    const akKredit = c.saldo === 'k' ? Math.max(0, saldoAkhir) : 0;

    // Masukkan hanya jika ada saldo awal atau mutasi
    if (saldoAwal !== 0 || mutDebet !== 0 || mutKredit !== 0 || adjDebet !== 0 || adjKredit !== 0) {
      rows.push({
        coa: c.coa,
        nama_perkiraan: c.nama_perkiraan,
        saldo: c.saldo,
        parent: c.parent,
        saDebet,
        saKredit,
        mutDebet,
        mutKredit,
        adjDebet,
        adjKredit,
        akDebet,
        akKredit,
      });

      totSaDebet += saDebet;
      totSaKredit += saKredit;
      totMutDebet += mutDebet;
      totMutKredit += mutKredit;
      totAdjDebet += adjDebet;
      totAdjKredit += adjKredit;
      totAkDebet += akDebet;
      totAkKredit += akKredit;
    }
  }

  const isBalanced = Math.abs(totAkDebet - totAkKredit) === 0;

  return {
    rows,
    summary: {
      totSaDebet,
      totSaKredit,
      totMutDebet,
      totMutKredit,
      totAdjDebet,
      totAdjKredit,
      totAkDebet,
      totAkKredit,
      isBalanced,
    },
  };
}

