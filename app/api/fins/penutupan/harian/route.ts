import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { getSaldoAwal } from '@/lib/fins/saldo';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const harianSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  coa: z.string().trim().min(1, 'Pilih akun kas'),
  idKantor: z.coerce.number().int().positive().default(1),
  totalFisik: z.coerce.number().min(0),
  detailKertas: z.string().optional().default('{}'),
  detailLogam: z.string().optional().default('{}'),
  keterangan: z.string().trim().max(500).optional().default(''),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = harianSchema.parse(rawBody);

    // 1. Hitung saldo sistem hari itu
    // Saldo awal hari itu
    const { saldoAwal } = await getSaldoAwal(
      { query: (sql: string, p?: any[]) => query(sql, p) },
      validated.coa,
      validated.tanggal,
      validated.idKantor
    );

    // Mutasi hari itu
    const mutasiRes = await query(
      `SELECT COALESCE(SUM(debet), 0)::numeric AS sum_debet,
              COALESCE(SUM(kredit), 0)::numeric AS sum_kredit
       FROM fins_jurnal
       WHERE coa = $1 AND tgl_exre = $2 AND id_kantor = $3`,
      [validated.coa, validated.tanggal, validated.idKantor]
    );

    const debet = Number(mutasiRes.rows[0]?.sum_debet || 0);
    const kredit = Number(mutasiRes.rows[0]?.sum_kredit || 0);
    const saldoSistem = saldoAwal + (debet - kredit);
    const adjustment = validated.totalFisik - saldoSistem;

    if (adjustment !== 0 && !validated.keterangan) {
      return NextResponse.json(
        { error: 'Terdapat selisih kas fisik vs sistem. Keterangan wajib diisi.' },
        { status: 400 }
      );
    }

    // 2. UPSERT fins_opname per='d', via='user'
    await query(
      `INSERT INTO fins_opname (
         tanggal, coa, saldo_awal, debet, kredit, adjustment, saldo_akhir,
         detail_kertas, detail_logam, id_kantor, id_via_bayar, active,
         per, keterangan, via, nik_input, updated
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 'y', 'd', $11, 'user', $12, NOW())
       ON CONFLICT (tanggal, coa, id_kantor, per, via)
       DO UPDATE SET
         saldo_awal = EXCLUDED.saldo_awal,
         debet = EXCLUDED.debet,
         kredit = EXCLUDED.kredit,
         adjustment = EXCLUDED.adjustment,
         saldo_akhir = EXCLUDED.saldo_akhir,
         detail_kertas = EXCLUDED.detail_kertas,
         detail_logam = EXCLUDED.detail_logam,
         keterangan = EXCLUDED.keterangan,
         nik_input = EXCLUDED.nik_input,
         updated = NOW()`,
      [
        validated.tanggal,
        validated.coa,
        saldoAwal,
        debet,
        kredit,
        adjustment,
        validated.totalFisik,
        validated.detailKertas,
        validated.detailLogam,
        validated.idKantor,
        validated.keterangan || 'Opname Kas Harian',
        userName.slice(0, 50),
      ]
    );

    try {
      await invalidateCache(['fins:opname:*', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in opname harian:', e);
    }

    return NextResponse.json({
      success: true,
      saldoSistem,
      saldoFisik: validated.totalFisik,
      adjustment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

