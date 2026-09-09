import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  id_bank: z.string().min(1).max(5),
  bank: z.string().min(2).max(50),
  description_code: z.string().optional().default(''),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(id_bank ILIKE $${params.length} OR bank ILIKE $${params.length} OR description_code ILIKE $${params.length})`);
    }
    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const dataParams = [...params, limit, offset];
    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM fins_bank${whereSql}`, params),
      query(`SELECT * FROM fins_bank${whereSql} ORDER BY id_bank ASC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`, dataParams),
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
      `INSERT INTO fins_bank (id_bank, bank, description_code) VALUES ($1, $2, $3) RETURNING *`,
      [data.id_bank, data.bank, data.description_code]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Kode bank sudah digunakan' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id_bank) return NextResponse.json({ error: 'Kode bank is required' }, { status: 400 });

    const data = schema.omit({ id_bank: true }).partial().parse(body);
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

    params.push(body.id_bank);
    const res = await query(
      `UPDATE fins_bank SET ${fields.join(', ')} WHERE id_bank = $${idx} RETURNING *`,
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
    const idBank = searchParams.get('id_bank');
    if (!idBank) return NextResponse.json({ error: 'Kode bank is required' }, { status: 400 });

    await query(`DELETE FROM fins_bank WHERE id_bank = $1`, [idBank]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
