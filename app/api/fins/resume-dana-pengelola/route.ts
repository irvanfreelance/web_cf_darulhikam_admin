import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { postTransaksi } from '@/lib/fins/posting';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const resumeDpQuerySchema = z.object({
  periodeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  periodeTo: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  idKantor: z.string().optional().default('all'),
});

const alokasiDpSchema = z.object({
  idProgram: z.coerce.number().int().min(1, 'Pilih program'),
  nominalAlokasi: z.coerce.number().positive('Nominal alokasi harus > 0'),
  coaDebet: z.string().trim().min(1, 'Pilih COA Dana Program'),
  coaKredit: z.string().trim().min(1, 'Pilih COA Dana Pengelola'),
  tglExre: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  periodeKey: z.string().trim().min(1),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = resumeDpQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { periodeFrom, periodeTo, idKantor } = parsed.data;
  const kantorId = idKantor !== 'all' ? Number(idKantor) : null;

  try {
    // 1. Ambil daftar program FINS aktif
    const progRes = await query(
      `SELECT id, kode, nama, dp_percent FROM fins_program WHERE aktif IS TRUE ORDER BY kode ASC`
    );

    // 2. Query penerimaan per program dalam periode
    const cond = [`j.jenis = 'r'`, `j.tgl_exre >= $1`, `j.tgl_exre <= $2`];
    const params: any[] = [periodeFrom, periodeTo];
    if (kantorId) {
      params.push(kantorId);
      cond.push(`j.id_kantor = $${params.length}`);
    }

    const penerimaanRes = await query(
      `SELECT j.id_program, COALESCE(SUM(j.debet), 0)::numeric AS total_penerimaan
       FROM fins_jurnal j
       WHERE ${cond.join(' AND ')}
       GROUP BY j.id_program`,
      params
    );

    const penerimaanMap: Record<number, number> = {};
    penerimaanRes.rows.forEach((r: any) => {
      penerimaanMap[Number(r.id_program || 0)] = Number(r.total_penerimaan || 0);
    });

    // 3. Gabungkan perhitungan
    let totalPenerimaanAll = 0;
    let totalHakDpAll = 0;

    const rows = progRes.rows.map((p: any) => {
      const penerimaan = penerimaanMap[Number(p.id)] || 0;
      const dpPercent = Number(p.dp_percent || 0);
      const hakDp = (penerimaan * dpPercent) / 100;

      totalPenerimaanAll += penerimaan;
      totalHakDpAll += hakDp;

      return {
        idProgram: p.id,
        kode: p.kode,
        nama: p.nama,
        dpPercent,
        penerimaan,
        hakDp,
      };
    });

    // Baris non-program (id_program=0)
    const penerimaanNonProgram = penerimaanMap[0] || 0;
    if (penerimaanNonProgram > 0) {
      totalPenerimaanAll += penerimaanNonProgram;
      rows.push({
        idProgram: 0,
        kode: 'NON',
        nama: 'Penerimaan Tanpa Program Khusus',
        dpPercent: 0,
        penerimaan: penerimaanNonProgram,
        hakDp: 0,
      });
    }

    return NextResponse.json({
      rows,
      summary: {
        totalPenerimaan: totalPenerimaanAll,
        totalHakDp: totalHakDpAll,
      },
    });
  } catch (error: any) {
    console.error('API Resume DP Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'Finance';

  try {
    const rawBody = await req.json();
    const validated = alokasiDpSchema.parse(rawBody);

    const result = await withTransaction(async (client) => {
      // Cek apakah alokasi periode ini sudah pernah diposting
      const checkNote = `ALOKASI_DP:${validated.idProgram}:${validated.periodeKey}`;
      const check = await client.query(
        `SELECT id FROM fins_trans WHERE note = $1 AND approve = 'a'`,
        [checkNote]
      );

      if (check.rowCount && check.rowCount > 0) {
        throw new Error('Alokasi Dana Pengelola untuk program & periode ini sudah pernah diposting.');
      }

      // Posting jurnal pemindahan hak amil
      const res = await postTransaksi(client, {
        jenis: 'e',
        coaDebet: validated.coaDebet,
        coaKredit: validated.coaKredit,
        nominal: validated.nominalAlokasi,
        quantity: 1,
        tglExre: validated.tglExre,
        keterangan: `Alokasi Hak Amil / Dana Pengelola (${validated.periodeKey})`,
        idProgram: validated.idProgram,
        nikInput: userName,
        approve: 'a',
      });

      // Update note transaksi sebagai penanda idempoten
      await client.query(`UPDATE fins_trans SET note = $1 WHERE id = $2`, [checkNote, res.finsTransId]);

      return res;
    });

    try {
      await invalidateCache(['fins:resume-dp:*', 'fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in resume dp:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

