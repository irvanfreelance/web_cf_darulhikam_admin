/**
 * Helper to compute opening balance (saldo awal) for a given COA, date, and optional office.
 * Combines latest opname before the given date + SUM(jurnal) up to that date.
 */
export async function getSaldoAwal(
  client: any,
  coa: string,
  tgl: string | Date,
  kantorId?: number | null
): Promise<{ saldoAwal: number; tglTitikAwal: string }> {
  const tglStr = typeof tgl === 'string' ? tgl.slice(0, 10) : tgl.toISOString().slice(0, 10);

  // 1. Ambil opname terakhir sebelum tanggal tglStr (baik opname tahunan 'y' saldo awal maupun opname harian 'd')
  const opnameRes = await client.query(
    `SELECT saldo_akhir, tanggal
     FROM fins_opname
     WHERE coa = $1 AND tanggal < $2
     ${kantorId ? `AND id_kantor = $3` : ''}
     ORDER BY tanggal DESC LIMIT 1`,
    kantorId ? [coa, tglStr, kantorId] : [coa, tglStr]
  );

  let saldoTitikAwal = 0;
  let tglTitikAwal = '1970-01-01';

  if (opnameRes.rowCount && opnameRes.rows[0]) {
    saldoTitikAwal = Number(opnameRes.rows[0].saldo_akhir || 0);
    tglTitikAwal = opnameRes.rows[0].tanggal.toISOString().slice(0, 10);
  }

  // 2. Ambil akumulasi mutasi jurnal antara tglTitikAwal dan tglStr
  const jurnalRes = await client.query(
    `SELECT COALESCE(SUM(debet), 0)::numeric AS sum_debet,
            COALESCE(SUM(kredit), 0)::numeric AS sum_kredit
     FROM fins_jurnal
     WHERE coa = $1 AND tgl_exre >= $2 AND tgl_exre < $3
     ${kantorId ? `AND id_kantor = $4` : ''}`,
    kantorId ? [coa, tglTitikAwal, tglStr, kantorId] : [coa, tglTitikAwal, tglStr]
  );

  const debet = Number(jurnalRes.rows[0]?.sum_debet || 0);
  const kredit = Number(jurnalRes.rows[0]?.sum_kredit || 0);

  // 3. Cek posisi saldo normal COA di fins_coa (debet atau kredit)
  const coaRes = await client.query(
    `SELECT saldo FROM fins_coa WHERE coa = $1 LIMIT 1`,
    [coa]
  );
  const normalSaldo = coaRes.rows[0]?.saldo === 'k' ? 'k' : 'd';

  const saldoAwal =
    normalSaldo === 'd'
      ? saldoTitikAwal + (debet - kredit)
      : saldoTitikAwal + (kredit - debet);

  return { saldoAwal, tglTitikAwal };
}

