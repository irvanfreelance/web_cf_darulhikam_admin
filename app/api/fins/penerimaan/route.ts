import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { generateIdTrans } from '@/lib/fins/id-trans';
import { z } from 'zod';

const penerimaanQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'approved', 'rejected']).optional().default('all'),
  periodeFrom: z.string().optional().default(''),
  periodeTo: z.string().optional().default(''),
  idKantor: z.string().optional().default('all'),
  keyword: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const penerimaanPostSchema = z.object({
  tglExre: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD'),
  coaDebet: z.string().trim().min(1, 'Pilih akun kas/bank debet'),
  coaKredit: z.string().trim().min(1, 'Pilih akun pendapatan kredit'),
  nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
  quantity: z.coerce.number().int().min(1).default(1),
  keterangan: z.string().trim().min(3, 'Keterangan minimal 3 karakter').max(500),
  idKantor: z.coerce.number().int().positive().nullable().optional(),
  idProgram: z.coerce.number().int().optional().default(0),
  mutasi: z.string().trim().max(2).optional().default('1'),
  kinerja: z.enum(['Kinerja', 'Komersil']).optional().default('Kinerja'),
  noresi: z.string().trim().max(16).optional().default(''),
  saveAndApprove: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = penerimaanQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { status, periodeFrom, periodeTo, idKantor, keyword, limit, offset } = parsed.data;

  try {
    const conditions: string[] = [`t.jenis = 'r'`, `t.crowdfunding_transaction_id IS NULL`];
    const params: any[] = [];

    if (status === 'draft') conditions.push(`t.approve = 'u'`);
    else if (status === 'approved') conditions.push(`t.approve = 'a'`);
    else if (status === 'rejected') conditions.push(`t.approve = 'r'`);

    if (periodeFrom) {
      params.push(periodeFrom);
      conditions.push(`t.tgl_exre >= $${params.length}`);
    }
    if (periodeTo) {
      params.push(periodeTo);
      conditions.push(`t.tgl_exre <= $${params.length}`);
    }
    if (idKantor !== 'all') {
      params.push(Number(idKantor));
      conditions.push(`t.id_kantor = $${params.length}`);
    }
    if (keyword) {
      params.push(`%${keyword.toLowerCase()}%`);
      const i = params.length;
      conditions.push(`(LOWER(t.id_trans) LIKE $${i} OR LOWER(t.keterangan) LIKE $${i} OR LOWER(t.noresi) LIKE $${i})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [rowsRes, countRes] = await Promise.all([
      query(
        `SELECT t.id, t.id_trans, t.id_exre, t.coa_debet, t.coa_kredit, t.nominal,
                t.quantity, t.total, t.keterangan, t.nik_input, t.nik_approve, t.tgl_exre,
                t.id_kantor, k.nama AS kantor_nama, t.approve, t.jenis, t.mutasi,
                t.id_program, p.nama AS program_nama, t.noresi, t.kinerja
         FROM fins_trans t
         LEFT JOIN fins_kantor k ON k.id = t.id_kantor
         LEFT JOIN fins_program p ON p.id = t.id_program
         ${whereClause}
         ORDER BY t.tgl_exre DESC, t.id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams
      ),
      query(`SELECT COUNT(*)::int AS total FROM fins_trans t ${whereClause}`, params),
    ]);

    return NextResponse.json({
      rows: rowsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
    });
  } catch (error: any) {
    console.error('API Penerimaan GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = penerimaanPostSchema.parse(rawBody);

    const result = await withTransaction(async (client) => {
      if (validated.saveAndApprove) {
        // Langsung approve dan terbitkan jurnal
        return await postTransaksi(client, {
          jenis: 'r',
          coaDebet: validated.coaDebet,
          coaKredit: validated.coaKredit,
          nominal: validated.nominal,
          quantity: validated.quantity,
          tglExre: validated.tglExre,
          keterangan: validated.keterangan,
          idKantor: validated.idKantor || null,
          idProgram: validated.idProgram || 0,
          mutasi: validated.mutasi || '1',
          kinerja: validated.kinerja || 'Kinerja',
          nikInput: userName,
          noresi: validated.noresi || '',
          approve: 'a',
        });
      }

      // Simpan sebagai draf (approve = 'u'), tanpa membuat jurnal
      const tglDate = new Date(validated.tglExre);
      const idTrans = generateIdTrans(tglDate);
      const total = validated.nominal * validated.quantity;

      const insRes = await client.query(
        `INSERT INTO fins_trans (
           id_trans, id_exre, coa_debet, coa_kredit, nominal, keterangan,
           nik_input, tgl_exre, realisasi, coa, id_kantor, id_via_bayar,
           approve, jenis, mutasi, id_program, noresi, total, quantity,
           kinerja
         )
         VALUES ($1, '', $2, $3, $4, $5, $6, $7, 0, $8, $9, 0, 'u', 'r', $10, $11, $12, $13, $14, $15)
         RETURNING id, id_trans`,
        [
          idTrans,
          validated.coaDebet,
          validated.coaKredit,
          validated.nominal,
          validated.keterangan,
          userName.slice(0, 20),
          tglDate,
          validated.coaDebet,
          validated.idKantor || null,
          validated.mutasi || '1',
          validated.idProgram || 0,
          validated.noresi || '',
          total,
          validated.quantity,
          validated.kinerja || 'Kinerja',
        ]
      );

      return { finsTransId: Number(insRes.rows[0].id), idTrans };
    });

    try {
      await invalidateCache(['fins:penerimaan:list', 'fins:jurnal:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

