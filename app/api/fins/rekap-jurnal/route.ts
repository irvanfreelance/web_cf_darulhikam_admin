import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

const rekapJurnalQuerySchema = z.object({
  periodeFrom: z.string().optional().default(''),
  periodeTo: z.string().optional().default(''),
  idKantor: z.string().optional().default('all'),
  coa: z.string().optional().default('all'),
  jenis: z.string().optional().default('all'),
  keyword: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const manualJurnalSchema = z.object({
  tglExre: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD'),
  coaDebet: z.string().trim().min(1, 'COA Debet wajib dipilih'),
  coaKredit: z.string().trim().min(1, 'COA Kredit wajib dipilih'),
  nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
  keterangan: z.string().trim().min(3, 'Keterangan minimal 3 karakter').max(500),
  idKantor: z.coerce.number().int().positive().nullable().optional(),
  idProgram: z.coerce.number().int().optional().default(0),
  jenisAje: z.enum(['akrual', 'depresiasi', 'koreksi', 'penutup', 'balik']).optional().default('koreksi'),
  noresi: z.string().trim().max(16).optional().default(''),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = rekapJurnalQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { periodeFrom, periodeTo, idKantor, coa, jenis, keyword, limit, offset } = parsed.data;

  try {
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (periodeFrom) {
      params.push(periodeFrom);
      where.push(`j.tgl_exre >= $${params.length}`);
    }
    if (periodeTo) {
      params.push(periodeTo);
      where.push(`j.tgl_exre <= $${params.length}`);
    }
    if (idKantor !== 'all') {
      params.push(Number(idKantor));
      where.push(`j.id_kantor = $${params.length}`);
    }
    if (coa !== 'all') {
      params.push(coa);
      where.push(`j.coa = $${params.length}`);
    }
    if (jenis !== 'all') {
      params.push(jenis);
      where.push(`j.jenis = $${params.length}`);
    }
    if (keyword) {
      params.push(`%${keyword.toLowerCase()}%`);
      const i = params.length;
      where.push(`(LOWER(j.id_jurnal) LIKE $${i} OR LOWER(j.id_trans) LIKE $${i} OR LOWER(j.id_exre) LIKE $${i} OR LOWER(j.keterangan) LIKE $${i})`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [rowsRes, countRes, totalsRes] = await Promise.all([
      query(
        `SELECT j.id, j.id_jurnal, j.id_trans, j.id_exre, j.coa, c.nama_coa AS coa_nama,
                j.debet, j.kredit, j.keterangan, j.nik_input, j.tgl_exre, j.id_kantor,
                k.nama AS kantor_nama, j.jenis, j.via_jurnal, j.noresi, j.id_program,
                j.fins_trans_id, j.period_id
         FROM fins_jurnal j
         LEFT JOIN fins_coa c ON c.coa = j.coa
         LEFT JOIN fins_kantor k ON k.id = j.id_kantor
         ${whereClause}
         ORDER BY j.tgl_exre DESC, j.id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      ),
      query(`SELECT COUNT(*)::int AS total FROM fins_jurnal j ${whereClause}`, params),
      query(
        `SELECT COALESCE(SUM(j.debet), 0)::numeric AS total_debet,
                COALESCE(SUM(j.kredit), 0)::numeric AS total_kredit
         FROM fins_jurnal j
         ${whereClause}`,
        params
      ),
    ]);

    return NextResponse.json({
      rows: rowsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      totalDebet: Number(totalsRes.rows[0]?.total_debet || 0),
      totalKredit: Number(totalsRes.rows[0]?.total_kredit || 0),
    });
  } catch (error: any) {
    console.error('API Rekap Jurnal GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'Manual';

  try {
    const rawBody = await req.json();
    const validated = manualJurnalSchema.parse(rawBody);

    const result = await withTransaction(async (client) => {
      // 1. Post transaksi dan 2 jurnal lewat helper resmi
      const { finsTransId, idTrans } = await postTransaksi(client, {
        jenis: 'e',
        coaDebet: validated.coaDebet,
        coaKredit: validated.coaKredit,
        nominal: validated.nominal,
        quantity: 1,
        tglExre: validated.tglExre,
        keterangan: validated.keterangan,
        idKantor: validated.idKantor || null,
        idProgram: validated.idProgram || 0,
        nikInput: userName,
        noresi: validated.noresi || '',
        approve: 'a',
      });

      // 2. Ambil id jurnal yang baru dibuat
      const jrnRes = await client.query(
        `SELECT id, coa, debet, kredit FROM fins_jurnal WHERE fins_trans_id = $1 ORDER BY id ASC`,
        [finsTransId]
      );

      const debetJrn = jrnRes.rows.find((r: any) => Number(r.debet) > 0);
      const kreditJrn = jrnRes.rows.find((r: any) => Number(r.kredit) > 0);

      // 3. Catat ke period_adjusting_entries bila tabel tersedia
      try {
        await client.query(
          `INSERT INTO period_adjusting_entries (
             period_id, jenis_aje, keterangan, coa_debet, coa_kredit,
             nominal, fins_trans_id, fins_jurnal_debet_id, fins_jurnal_kredit_id,
             is_reversal, nik_input, approved_by, approved_at
           )
           VALUES (
             (SELECT period_id FROM fins_trans WHERE id = $1),
             $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, NOW()
           )`,
          [
            finsTransId,
            validated.jenisAje,
            validated.keterangan,
            validated.coaDebet,
            validated.coaKredit,
            validated.nominal,
            finsTransId,
            debetJrn?.id || null,
            kreditJrn?.id || null,
            userName,
            userName,
          ]
        );
      } catch (paeErr) {
        console.warn('Note: period_adjusting_entries skip insert:', paeErr);
      }

      return { finsTransId, idTrans };
    });

    try {
      await invalidateCache(['fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in rekap-jurnal:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

