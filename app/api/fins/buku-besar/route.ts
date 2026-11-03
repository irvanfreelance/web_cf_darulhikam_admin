import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { getSaldoAwal } from '@/lib/fins/saldo';
import { z } from 'zod';

const bukuBesarQuerySchema = z.object({
  coa: z.string().trim().min(1, 'Pilih kode COA'),
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
  const parsed = bukuBesarQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { coa, periodeFrom, periodeTo, idKantor } = parsed.data;

  try {
    const kantorId = idKantor !== 'all' ? Number(idKantor) : null;

    // Cek apakah akun adalah induk (parent='y')
    const coaRes = await query(`SELECT coa, nama_coa AS nama_perkiraan, saldo, parent FROM fins_coa WHERE coa = $1`, [coa]);
    if (coaRes.rowCount === 0) {
      return NextResponse.json({ error: 'Akun COA tidak ditemukan' }, { status: 404 });
    }

    const coaInfo = coaRes.rows[0];
    const normalSaldo = coaInfo.saldo === 'k' ? 'k' : 'd';
    const isParent = coaInfo.parent === 'y';

    // Bila parent, cari prefix untuk menyertakan semua turunan
    const coaPrefix = coa.replace(/(\.000)+$/, '');

    // 1. Hitung saldo awal
    let saldoAwal = 0;
    if (!isParent) {
      const sa = await getSaldoAwal(
        { query: (sql: string, p?: any[]) => query(sql, p) },
        coa,
        periodeFrom,
        kantorId
      );
      saldoAwal = sa.saldoAwal;
    } else {
      // Ambil saldo awal seluruh anak COA
      const children = await query(
        `SELECT coa FROM fins_coa WHERE coa LIKE $1 AND parent = 'n' AND active = 'y'`,
        [`${coaPrefix}%`]
      );
      for (const child of children.rows) {
        const sa = await getSaldoAwal(
          { query: (sql: string, p?: any[]) => query(sql, p) },
          child.coa,
          periodeFrom,
          kantorId
        );
        saldoAwal += sa.saldoAwal;
      }
    }

    // 2. Query transaksi jurnal
    const conditions = [
      isParent ? `j.coa LIKE $1` : `j.coa = $1`,
      `j.tgl_exre >= $2`,
      `j.tgl_exre <= $3`,
    ];
    const params: any[] = [isParent ? `${coaPrefix}%` : coa, periodeFrom, periodeTo];

    if (kantorId) {
      params.push(kantorId);
      conditions.push(`j.id_kantor = $${params.length}`);
    }

    const sql = `
      SELECT j.id, j.id_jurnal, j.id_trans, j.id_exre, j.coa, c.nama_coa AS coa_nama,
             j.debet, j.kredit, j.keterangan, j.nik_input, j.tgl_exre, j.noresi,
             j.id_kantor, k.nama AS kantor_nama, j.fins_trans_id
      FROM fins_jurnal j
      LEFT JOIN fins_coa c ON c.coa = j.coa
      LEFT JOIN fins_kantor k ON k.id = j.id_kantor
      WHERE ${conditions.join(' AND ')}
      ORDER BY j.tgl_exre ASC, j.id ASC
    `;

    const mutasiRes = await query(sql, params);

    // 3. Hitung running balance
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
    console.error('API Buku Besar Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

