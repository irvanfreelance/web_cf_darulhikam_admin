import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  id_rekening: z.string().min(1).max(50),
  id_bank: z.string().min(1).max(5),
  keterangan: z.string().min(2).max(100),
  coa: z.string().min(1).max(15),
  scrap: z.enum(['y', 'n']).default('n'),
  active: z.enum(['y', 'n']).default('y'),
  note: z.string().optional().default(''),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const scrap = searchParams.get('scrap');
    const coa = searchParams.get('coa');
    const active = searchParams.get('active');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(r.id_rekening ILIKE $${params.length} OR r.keterangan ILIKE $${params.length} OR b.bank ILIKE $${params.length})`);
    }
    if (scrap && scrap !== 'all') {
      params.push(scrap);
      conditions.push(`r.scrap = $${params.length}`);
    }
    if (coa && coa !== 'all') {
      params.push(coa);
      conditions.push(`r.coa = $${params.length}`);
    }
    if (active && active !== 'all') {
      params.push(active);
      conditions.push(`r.active = $${params.length}`);
    }
    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const baseSql = `
      FROM fins_bank_rek r
      JOIN fins_bank b ON b.id_bank = r.id_bank
      LEFT JOIN fins_coa c ON c.coa = r.coa
      ${whereSql}
    `;

    const dataParams = [...params, limit, offset];
    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*) ${baseSql}`, params),
      query(
        `SELECT r.*, b.bank, c.nama_coa
         ${baseSql}
         ORDER BY b.bank ASC, r.id_rekening ASC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      ),
    ]);

    return NextResponse.json({
      rows: dataRes.rows,
      totalCount: parseInt(countRes.rows[0].count, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const res = await query(
      `INSERT INTO fins_bank_rek (id_rekening, id_bank, keterangan, coa, scrap, active, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.id_rekening, data.id_bank, data.keterangan, data.coa, data.scrap, data.active, data.note]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Nomor rekening sudah digunakan' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id_rekening) return NextResponse.json({ error: 'No. Rekening is required' }, { status: 400 });

    const data = schema.omit({ id_rekening: true }).partial().parse(body);
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    if (fields.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    params.push(body.id_rekening);
    const res = await query(
      `UPDATE fins_bank_rek SET ${fields.join(', ')} WHERE id_rekening = $${idx} RETURNING *`,
      params
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idRekening = searchParams.get('id_rekening');
    if (!idRekening) return NextResponse.json({ error: 'No. Rekening is required' }, { status: 400 });

    await query(`DELETE FROM fins_bank_rek WHERE id_rekening = $1`, [idRekening]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
