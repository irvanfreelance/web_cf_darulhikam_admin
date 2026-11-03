import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const saldoAwalQuerySchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  idKantor: z.string().optional().default('1'),
});

const saldoAwalItemSchema = z.object({
  coa: z.string().trim().min(1),
  saldo: z.coerce.number().min(0),
});

const saldoAwalPutSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  idKantor: z.coerce.number().int().positive().default(1),
  items: z.array(saldoAwalItemSchema).min(1, 'Minimal 1 akun COA'),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = saldoAwalQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { tanggal, idKantor } = parsed.data;
  const kantorId = Number(idKantor) || 1;

  try {
    const res = await query(
      `SELECT c.coa, c.nama_coa AS nama_perkiraan, c.saldo, c.parent,
              COALESCE(o.saldo_akhir, 0)::numeric AS saldo_awal
       FROM fins_coa c
       LEFT JOIN fins_opname o ON o.coa = c.coa
            AND o.tanggal = $1
            AND o.id_kantor = $2
            AND o.per = 'y'
            AND o.via = 'user'
       WHERE c.active = 'y' AND c.parent = 'n'
       ORDER BY c.coa ASC`,
      [tanggal, kantorId]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Saldo Awal GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = saldoAwalPutSchema.parse(rawBody);

    await withTransaction(async (client) => {
      for (const item of validated.items) {
        // UPSERT fins_opname dengan per='y', via='user'
        await client.query(
          `INSERT INTO fins_opname (
             tanggal, coa, saldo_awal, debet, kredit, adjustment, saldo_akhir,
             id_kantor, id_via_bayar, active, per, keterangan, via, nik_input, updated
           )
           VALUES ($1, $2, $3, 0, 0, 0, $3, $4, 0, 'y', 'y', 'Saldo Awal', 'user', $5, NOW())
           ON CONFLICT (tanggal, coa, id_kantor, per, via)
           DO UPDATE SET
             saldo_awal = EXCLUDED.saldo_awal,
             saldo_akhir = EXCLUDED.saldo_akhir,
             nik_input = EXCLUDED.nik_input,
             updated = NOW()`,
          [
            validated.tanggal,
            item.coa,
            item.saldo,
            validated.idKantor,
            userName.slice(0, 50),
          ]
        );
      }
    });

    try {
      await invalidateCache(['fins:saldo-awal:*', 'fins:dashboard-cash', 'fins:opname:*']);
    } catch (e) {
      console.warn('Redis flush error in saldo awal:', e);
    }

    return NextResponse.json({ success: true, count: validated.items.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

