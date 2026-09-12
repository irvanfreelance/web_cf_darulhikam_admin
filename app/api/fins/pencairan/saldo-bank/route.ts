import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Saldo bank is read from the latest daily reconciliation snapshot in
// fins_opname for the bank account's COA (see markdown_darul_hikam/01_fins_schema_postgres.sql,
// TABLE 9). No live ledger balance exists yet, so this returns 0 when no
// opname row has been recorded for that COA/office.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coa = searchParams.get('coa');
  const officeId = searchParams.get('officeId');

  if (!coa || !officeId) {
    return NextResponse.json({ error: 'coa dan officeId wajib diisi' }, { status: 400 });
  }

  const res = await query(
    `SELECT saldo_akhir, tanggal FROM fins_opname
     WHERE coa = $1 AND id_kantor = $2 AND per = 'd'
     ORDER BY tanggal DESC LIMIT 1`,
    [coa, Number(officeId)]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ saldoAkhir: 0, tanggal: null });
  }
  return NextResponse.json({ saldoAkhir: Number(res.rows[0].saldo_akhir), tanggal: res.rows[0].tanggal });
}
