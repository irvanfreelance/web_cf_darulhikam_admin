import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  id_kantor: z.coerce.number().int().positive(),
  coa_cash: z.string().min(1).max(14),
  coa_non_cash: z.string().min(1).max(14),
});

export async function GET() {
  try {
    const res = await query(`
      SELECT m.id, m.id_kantor, k.nama AS kantor_nama,
             m.coa_cash, cc.nama_coa AS coa_cash_nama,
             m.coa_non_cash, cn.nama_coa AS coa_non_cash_nama
      FROM fins_kantor_coa m
      JOIN fins_kantor k ON k.id = m.id_kantor
      LEFT JOIN fins_coa cc ON cc.coa = m.coa_cash
      LEFT JOIN fins_coa cn ON cn.coa = m.coa_non_cash
      ORDER BY k.id ASC
    `);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const res = await query(
      `INSERT INTO fins_kantor_coa (id_kantor, coa_cash, coa_non_cash) VALUES ($1, $2, $3) RETURNING *`,
      [data.id_kantor, data.coa_cash, data.coa_non_cash]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Kantor ini sudah memiliki mapping COA' }, { status: 400 });
    if (error.code === '23503') return NextResponse.json({ error: 'Kantor atau COA yang dipilih tidak valid' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data = schema.partial().parse(body);
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

    params.push(body.id);
    const res = await query(
      `UPDATE fins_kantor_coa SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Kantor ini sudah memiliki mapping COA' }, { status: 400 });
    if (error.code === '23503') return NextResponse.json({ error: 'Kantor atau COA yang dipilih tidak valid' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await query(`DELETE FROM fins_kantor_coa WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
