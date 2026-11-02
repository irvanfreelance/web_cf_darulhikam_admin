import { formatWibDate } from '@/lib/wib-date';

export class JournalError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

type SqlClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> };

export type BalancedEntryInput = {
  tanggal: string;
  nominal: number;
  coaDebet: string;
  coaKredit: string;
  keterangan: string;
  idTransaksi: string;
  idExre?: string;
  noresi?: string;
  nikInput: string;
  jenis: 'r' | 'e';
  mutasi?: string;
  note?: string;
  idProgram?: number;
};

function newIdTrans() {
  const now = new Date();
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  const stamp = `${pad(now.getUTCFullYear() % 100)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${stamp}${pad(Math.floor(Math.random() * 1_000_000), 6)}`.slice(0, 20);
}

export async function assertPeriodOpen(client: SqlClient, tanggal: string) {
  const found = await client.query(
    `SELECT id, status, periode_bulan, periode_tahun
     FROM accounting_periods
     WHERE periode_tahun = EXTRACT(YEAR FROM $1::date)::int
       AND periode_bulan = EXTRACT(MONTH FROM $1::date)::int`,
    [formatWibDate(tanggal)]
  );
  if ((found.rowCount ?? 0) === 0) return null;
  const period = found.rows[0];
  if (period.status !== 'open') {
    throw new JournalError(`Periode ${period.periode_bulan}/${period.periode_tahun} berstatus ${period.status}. Jurnal ditolak.`);
  }
  return Number(period.id);
}

export async function postBalancedEntry(client: SqlClient, input: BalancedEntryInput) {
  if (!(input.nominal > 0)) throw new JournalError('Nominal jurnal harus lebih dari 0', 400);
  if (!input.coaDebet || !input.coaKredit) throw new JournalError('COA debet dan kredit wajib diisi', 400);
  if (input.coaDebet === input.coaKredit) throw new JournalError('COA debet dan kredit tidak boleh sama', 400);

  const tanggal = formatWibDate(input.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new JournalError('Tanggal jurnal tidak valid', 400);
  const periodId = await assertPeriodOpen(client, tanggal);
  const keterangan = input.keterangan.slice(0, 500);
  const jurnalText = keterangan.slice(0, 200);
  const nik = input.nikInput.slice(0, 20) || 'admin';
  const nikApprove = nik.slice(0, 15);
  const idTransaksi = input.idTransaksi.slice(0, 30);
  const idExre = (input.idExre || input.idTransaksi).slice(0, 20);
  const noresi = (input.noresi || '').slice(0, 16);
  const coaDebet = input.coaDebet.slice(0, 14);
  const coaKredit = input.coaKredit.slice(0, 14);
  const coaCa = (input.jenis === 'r' ? coaKredit : coaDebet).slice(0, 14);
  const kinerja = input.jenis === 'e' ? 'Kinerja' : 'Komersil';

  let inserted: { id: number; id_trans: string } | null = null;
  for (let attempt = 0; attempt < 4 && !inserted; attempt += 1) {
    const idTrans = newIdTrans();
    try {
      const res = await client.query(
        `INSERT INTO fins_trans (
           id_trans, id_transaksi, id_exre, coa_ca, coa_debet, coa_kredit,
           nominal, keterangan, nik_input, nik_approve, tgl_exre, coa, approve, jenis, mutasi,
           id_kantor, id_via_bayar, id_program, noresi, total, quantity, kinerja, note, period_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,
           $7,$8,$9,$10,$11::timestamptz,$5,'a',$12,$13,
           1,2,$14,$15,$7,1,$16,$17,$18
         )
         RETURNING id, id_trans`,
        [
          idTrans, idTransaksi, idExre, coaCa, coaDebet, coaKredit,
          input.nominal, keterangan, nik, nikApprove, tanggal, input.jenis, (input.mutasi || '3').slice(0, 2),
          input.idProgram || 0, noresi, kinerja, (input.note || '').slice(0, 2000), periodId,
        ]
      );
      inserted = res.rows[0];
    } catch (error: any) {
      if (error?.code !== '23505') throw error;
    }
  }
  if (!inserted) throw new JournalError('Gagal membuat kode transaksi yang unik', 500);

  const lineSql = `INSERT INTO fins_jurnal (
    id_jurnal, id_transaksi, id_exre, coa, debet, kredit, keterangan, nik_input, tgl_exre,
    id_kantor, id_via_bayar, jenis, via_jurnal, id_trans, coa_buku, noresi, id_program, kinerja,
    fins_trans_id, period_id
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,1,2,$10,3,$11,$12,$13,$14,$15,$16,$17)`;

  await client.query(lineSql, [
    `${inserted.id_trans}1`, idTransaksi, idExre, coaDebet, input.nominal, 0, jurnalText, nik, tanggal,
    'r', inserted.id_trans, coaKredit, noresi, input.idProgram || 0, kinerja, inserted.id, periodId,
  ]);
  await client.query(lineSql, [
    `${inserted.id_trans}2`, idTransaksi, idExre, coaKredit, 0, input.nominal, jurnalText, nik, tanggal,
    'e', inserted.id_trans, coaDebet, noresi, input.idProgram || 0, kinerja, inserted.id, periodId,
  ]);

  return { id: Number(inserted.id), idTrans: inserted.id_trans as string, periodId };
}
