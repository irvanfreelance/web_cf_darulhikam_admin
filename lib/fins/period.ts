export class PeriodClosedError extends Error {
  constructor(message: string = 'Periode akuntansi sudah ditutup (closed)') {
    super(message);
    this.name = 'PeriodClosedError';
  }
}

/**
 * Resolves the accounting period for a given date.
 * Throws PeriodClosedError if the period is closed.
 */
export async function resolvePeriod(
  client: any,
  tglInput: string | Date
): Promise<{ id: number | null; status: string | null }> {
  const d = typeof tglInput === 'string' ? new Date(tglInput) : tglInput;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const res = await client.query(
    `SELECT id, status FROM accounting_periods WHERE periode_tahun = $1 AND periode_bulan = $2 LIMIT 1`,
    [year, month]
  );

  if (res.rowCount === 0) {
    return { id: null, status: null };
  }

  const period = res.rows[0];
  if (period.status === 'closed') {
    throw new PeriodClosedError(
      `Periode akuntansi ${month}/${year} sudah ditutup (closed)`
    );
  }

  return { id: Number(period.id), status: period.status };
}

