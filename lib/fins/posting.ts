import { generateIdTrans } from './id-trans';
import { getViaJurnal } from './via-jurnal';
import { resolvePeriod, PeriodClosedError } from './period';
import { z } from 'zod';

export { PeriodClosedError };

export const postTransaksiInputSchema = z.object({
  jenis: z.enum(['r', 'e'], { error: 'Jenis transaksi harus r (receipt) atau e (expense)' }),
  coaDebet: z.string().trim().min(1, 'COA Debet wajib diisi'),
  coaKredit: z.string().trim().min(1, 'COA Kredit wajib diisi'),
  nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
  quantity: z.coerce.number().int().min(1).default(1),
  tglExre: z.string().or(z.date()),
  keterangan: z.string().trim().min(1, 'Keterangan wajib diisi').max(500),
  idExre: z.string().trim().max(20).optional().default(''),
  idKantor: z.coerce.number().int().positive().optional().nullable(),
  idViaBayar: z.coerce.number().int().optional().default(0),
  mutasi: z.string().trim().max(2).optional().default(''),
  idProgram: z.coerce.number().int().optional().default(0),
  kinerja: z.enum(['Kinerja', 'Komersil']).optional().default('Kinerja'),
  nikInput: z.string().trim().max(20).default('system'),
  noresi: z.string().trim().max(16).optional().default(''),
  approve: z.enum(['a', 'as', 'aj', 'asj', 'ac', 'us', 'r']).default('a'),
  crowdfundingTransactionId: z.coerce.number().int().optional().nullable(),
  crowdfundingTransactionCreatedAt: z.string().or(z.date()).optional().nullable(),
});

export type PostTransaksiInput = z.input<typeof postTransaksiInputSchema>;

/**
 * Creates 1 fins_trans row and 2 fins_jurnal rows (1 debet, 1 kredit) atomically.
 * Must be executed within an existing client transaction block (withTransaction).
 */
export async function postTransaksi(
  client: any,
  rawInput: PostTransaksiInput
): Promise<{ finsTransId: number; idTrans: string }> {
  const input = postTransaksiInputSchema.parse(rawInput);

  if (input.coaDebet === input.coaKredit) {
    throw new Error('COA Debet dan COA Kredit tidak boleh sama');
  }

  // Validate active non-parent COA in fins_coa
  const coaCheck = await client.query(
    `SELECT coa, active, parent FROM fins_coa WHERE coa IN ($1, $2)`,
    [input.coaDebet, input.coaKredit]
  );

  const foundCoas = coaCheck.rows as Array<{ coa: string; active: string; parent: string }>;
  if (foundCoas.length < 2) {
    const foundCodes = foundCoas.map((c) => c.coa);
    const missing = [input.coaDebet, input.coaKredit].filter((c) => !foundCodes.includes(c));
    throw new Error(`Akun COA tidak ditemukan di Chart of Accounts: ${missing.join(', ')}`);
  }

  for (const c of foundCoas) {
    if (c.active !== 'y') {
      throw new Error(`Akun COA ${c.coa} berstatus nonaktif`);
    }
    if (c.parent === 'y') {
      throw new Error(`Akun COA ${c.coa} merupakan akun induk (header), pilih akun transaksi`);
    }
  }

  const tglDate = typeof input.tglExre === 'string' ? new Date(input.tglExre) : input.tglExre;
  const tglDateString = tglDate.toISOString().slice(0, 10);
  const period = await resolvePeriod(client, tglDate);

  const total = Number(input.nominal) * Number(input.quantity);
  const idTrans = generateIdTrans(tglDate);
  const viaJurnal = getViaJurnal(input.mutasi);
  const nikInput20 = (input.nikInput || 'system').slice(0, 20);
  const ket200 = input.keterangan.slice(0, 200);

  // 1. Insert fins_trans
  const transRes = await client.query(
    `INSERT INTO fins_trans (
       id_trans, id_exre, coa_debet, coa_kredit, nominal, keterangan,
       nik_input, tgl_exre, realisasi, coa, id_kantor, id_via_bayar,
       approve, jenis, mutasi, id_program, noresi, total, quantity,
       kinerja, period_id, crowdfunding_transaction_id, crowdfunding_transaction_created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
     RETURNING id, id_trans`,
    [
      idTrans,
      input.idExre || '',
      input.coaDebet,
      input.coaKredit,
      input.nominal,
      input.keterangan,
      nikInput20,
      tglDate,
      total,
      input.coaDebet,
      input.idKantor || null,
      input.idViaBayar || 0,
      input.approve,
      input.jenis,
      input.mutasi || '',
      input.idProgram || 0,
      input.noresi || '',
      total,
      input.quantity || 1,
      input.kinerja || 'Kinerja',
      period.id,
      input.crowdfundingTransactionId || null,
      input.crowdfundingTransactionCreatedAt || null,
    ]
  );

  const finsTransId = Number(transRes.rows[0].id);

  // 2. Insert 2 baris fins_jurnal: 1 debet, 1 kredit
  const idJurnalDebet = `${idTrans}1`;
  const idJurnalKredit = `${idTrans}2`;

  await client.query(
    `INSERT INTO fins_jurnal (
       id_jurnal, id_exre, coa, debet, kredit, keterangan, nik_input,
       tgl_exre, id_kantor, id_via_bayar, jenis, via_jurnal, id_trans,
       noresi, id_program, kinerja, fins_trans_id, period_id
     )
     VALUES
       ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17),
       ($18, $19, $20, 0, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)`,
    [
      // Baris 1: DEBET
      idJurnalDebet,
      input.idExre || '',
      input.coaDebet,
      total,
      ket200,
      nikInput20,
      tglDateString,
      input.idKantor || null,
      input.idViaBayar || 0,
      input.jenis,
      viaJurnal,
      idTrans,
      input.noresi || '',
      input.idProgram || 0,
      input.kinerja || 'Kinerja',
      finsTransId,
      period.id,

      // Baris 2: KREDIT
      idJurnalKredit,
      input.idExre || '',
      input.coaKredit,
      total,
      ket200,
      nikInput20,
      tglDateString,
      input.idKantor || null,
      input.idViaBayar || 0,
      input.jenis,
      viaJurnal,
      idTrans,
      input.noresi || '',
      input.idProgram || 0,
      input.kinerja || 'Kinerja',
      finsTransId,
      period.id,
    ]
  );

  return { finsTransId, idTrans };
}

/**
 * Reverses a transaction by posting equal opposing entries.
 * Sets the original trans approve status to 'r' and logs adjusting entry.
 * DOES NOT DELETE any rows.
 */
export async function reverseTransaksi(
  client: any,
  finsTransId: number,
  alasan: string = 'Pembatalan Transaksi',
  nikActor: string = 'system'
): Promise<{ reversalTransId: number }> {
  const check = await client.query(
    `SELECT * FROM fins_trans WHERE id = $1`,
    [finsTransId]
  );

  if (check.rowCount === 0) {
    throw new Error('Transaksi FINS tidak ditemukan');
  }

  const orig = check.rows[0];
  if (orig.approve === 'r') {
    throw new Error('Transaksi ini sudah pernah dibatalkan / dibalik');
  }

  // Update status transaksi asli menjadi 'r'
  await client.query(
    `UPDATE fins_trans SET approve = 'r' WHERE id = $1`,
    [finsTransId]
  );

  // Buat transaksi pembalik (swap debet dan kredit)
  const reversalResult = await postTransaksi(client, {
    jenis: orig.jenis,
    coaDebet: orig.coa_kredit, // ditukar
    coaKredit: orig.coa_debet, // ditukar
    nominal: orig.nominal,
    quantity: orig.quantity,
    tglExre: new Date(),
    keterangan: `BALIK: ${alasan} (${orig.id_trans})`,
    idExre: orig.id_exre,
    idKantor: orig.id_kantor,
    idViaBayar: orig.id_via_bayar,
    mutasi: orig.mutasi,
    idProgram: orig.id_program,
    kinerja: orig.kinerja,
    nikInput: nikActor,
    noresi: orig.noresi,
    approve: 'r',
  });

  return { reversalTransId: reversalResult.finsTransId };
}
