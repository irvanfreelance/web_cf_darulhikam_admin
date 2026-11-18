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

  const allMutRes = await client.query(
    `SELECT j.coa,
       COALESCE(SUM(CASE WHEN pae.fins_trans_id IS NULL THEN j.debet ELSE 0 END), 0)::numeric AS mut_debet,
       COALESCE(SUM(CASE WHEN pae.fins_trans_id IS NULL THEN j.kredit ELSE 0 END), 0)::numeric AS mut_kredit,
       COALESCE(SUM(CASE WHEN pae.fins_trans_id IS NOT NULL THEN j.debet ELSE 0 END), 0)::numeric AS adj_debet,
       COALESCE(SUM(CASE WHEN pae.fins_trans_id IS NOT NULL THEN j.kredit ELSE 0 END), 0)::numeric AS adj_kredit
     FROM fins_jurnal j
     LEFT JOIN period_adjusting_entries pae ON pae.fins_trans_id = j.fins_trans_id
     WHERE j.tgl_exre >= $1 AND j.tgl_exre <= $2
     ${idKantor ? `AND j.id_kantor = $3` : ''}
     GROUP BY j.coa`,
    idKantor ? [periodeFrom, periodeTo, idKantor] : [periodeFrom, periodeTo]
  );
  const mutMap = new Map<string, any>();
  for (const r of allMutRes.rows) mutMap.set(r.coa, r);

  const leafCoas = coaRes.rows.filter((c: any) => c.parent !== 'y');
  const saldoList = await Promise.all(
    leafCoas.map((c: any) => getSaldoAwal(client, c.coa, periodeFrom, idKantor))
  );

  for (let i = 0; i < leafCoas.length; i++) {
    const c = leafCoas[i];
    const { saldoAwal } = saldoList[i];
    const saDebet = c.saldo === 'd' ? Math.max(0, saldoAwal) : 0;
    const saKredit = c.saldo === 'k' ? Math.max(0, saldoAwal) : 0;

    const mutRow = mutMap.get(c.coa);
    const mutDebet = Number(mutRow?.mut_debet || 0);
    const mutKredit = Number(mutRow?.mut_kredit || 0);
    const adjDebet = Number(mutRow?.adj_debet || 0);
    const adjKredit = Number(mutRow?.adj_kredit || 0);

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

