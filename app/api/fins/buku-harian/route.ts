import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { getSaldoAwal } from '@/lib/fins/saldo';
import { z } from 'zod';

const bukuHarianQuerySchema = z.object({
  coa: z.string().trim().min(1, 'Pilih akun COA kas/bank'),
  periodeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  periodeTo: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  idKantor: z.string().optional().default('all'),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = bukuHarianQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { coa, periodeFrom, periodeTo, idKantor } = parsed.data;

  try {
    const kantorId = idKantor !== 'all' ? Number(idKantor) : null;

    // 1. Hitung saldo awal per tanggal periodeFrom
    const { saldoAwal } = await getSaldoAwal(
      { query: (sql: string, p?: any[]) => query(sql, p) },
      coa,
      periodeFrom,
      kantorId
    );

    // 2. Ambil info akun COA
    const coaRes = await query(`SELECT coa, nama_coa AS nama_perkiraan, saldo FROM fins_coa WHERE coa = $1`, [coa]);
    const coaInfo = coaRes.rows[0] || { coa, nama_perkiraan: coa, saldo: 'd' };
    const normalSaldo = coaInfo.saldo === 'k' ? 'k' : 'd';

    // 3. Ambil mutasi transaksi dalam rentang tanggal
    const params: any[] = [coa, periodeFrom, periodeTo];
    if (kantorId) params.push(kantorId);

    const mutasiSql = `
      SELECT j.id, j.id_jurnal, j.id_trans, j.id_exre, j.debet, j.kredit,
             j.keterangan, j.nik_input, j.tgl_exre, j.noresi, j.id_kantor,
             k.nama AS kantor_nama
      FROM fins_jurnal j
      LEFT JOIN fins_kantor k ON k.id = j.id_kantor
      WHERE j.coa = $1 AND j.tgl_exre >= $2 AND j.tgl_exre <= $3
      ${kantorId ? `AND j.id_kantor = $4` : ''}
      ORDER BY j.tgl_exre ASC, j.id ASC
    `;

    const mutasiRes = await query(mutasiSql, params);

    // 4. Hitung running balance (saldo berjalan)
    let currentBalance = saldoAwal;
    let totalDebet = 0;
    let totalKredit = 0;

    const rowsWithBalance = mutasiRes.rows.map((row) => {
      const d = Number(row.debet || 0);
      const k = Number(row.kredit || 0);
      totalDebet += d;
      totalKredit += k;

      if (normalSaldo === 'd') {
        currentBalance += d - k;
      } else {
        currentBalance += k - d;
      }

      return {
        ...row,
        debet: d,
        kredit: k,
        saldo_berjalan: currentBalance,
      };
    });

    return NextResponse.json({
      coaInfo,
      saldoAwal,
      totalDebet,
      totalKredit,
      saldoAkhir: currentBalance,
      rows: rowsWithBalance,
    });
  } catch (error: any) {
    console.error('API Buku Harian Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

