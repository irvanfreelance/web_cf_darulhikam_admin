import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const submitLpjSchema = z.object({
  tglLpj: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD'),
  nominalLpj: z.coerce.number().min(0, 'Nominal realisasi tidak boleh negatif'),
  buktiLpjUrl: z.string().trim().url('URL bukti tidak valid').or(z.literal('')).optional(),
  pengembali: z.string().trim().max(150).optional().default(''),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  try {
    const rawBody = await req.json();
    const validated = submitLpjSchema.parse(rawBody);
    const userName = session.user?.name || 'User';

    const check = await query(
      `SELECT * FROM fins_ca_pengajuan WHERE id = $1`,
      [numId]
    );

    if (check.rowCount === 0) {
      return NextResponse.json({ error: 'Data CA tidak ditemukan' }, { status: 404 });
    }

    const ca = check.rows[0];
    if (ca.approve !== 'a') {
      return NextResponse.json(
        { error: 'Hanya CA yang sudah dicairkan (status A) yang dapat mengajukan LPJ' },
        { status: 400 }
      );
    }

    const selisih = Number(ca.realisasi) - Number(validated.nominalLpj);

    const res = await query(
      `UPDATE fins_ca_pengajuan
       SET approve = 'aj',
           tgl_lpj = $1,
           nominal_lpj = $2,
           bukti_lpj_url = $3,
           pengembali = $4,
           user_lpj = $5,
           selisih = $6,
           updated_at = NOW()
       WHERE id = $7 AND approve = 'a'
       RETURNING *`,
      [
        validated.tglLpj,
        validated.nominalLpj,
        validated.buktiLpjUrl || null,
        validated.pengembali || userName,
        userName,
        selisih,
        numId,
      ]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Data sudah diproses' }, { status: 409 });
    }

    try {
      await invalidateCache(['fins:ca:list', 'fins:pencairan:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in lpj-ca patch:', e);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

