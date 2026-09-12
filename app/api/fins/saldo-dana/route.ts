import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  coa_dana: z.string().min(1).max(15),
  coa_expend: z.string().optional().default(''),
  coa_receipt: z.string().optional().default(''),
  ops: z.enum(['y', 'n']).default('n'),
  active: z.enum(['y', 'n']).default('y'),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.coa_dana ILIKE $${params.length} OR c.nama_coa ILIKE $${params.length} OR s.coa_expend ILIKE $${params.length} OR s.coa_receipt ILIKE $${params.length})`);
    }
    if (active && active !== 'all') {
      params.push(active);
      conditions.push(`s.active = $${params.length}`);
    }
    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const baseSql = `
      FROM fins_saldo_dana s
      LEFT JOIN fins_coa c ON c.coa = s.coa_dana
      ${whereSql}
    `;

    const dataParams = [...params, limit, offset];
    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*) ${baseSql}`, params),
      query(
        `SELECT s.*, c.nama_coa, c.level, c.parent
         ${baseSql}
         ORDER BY s.coa_dana ASC
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
      `INSERT INTO fins_saldo_dana (coa_dana, coa_expend, coa_receipt, ops, active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.coa_dana, data.coa_expend, data.coa_receipt, data.ops, data.active]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Mapping untuk COA ini sudah ada' }, { status: 400 });
    if (error.code === '23503') return NextResponse.json({ error: 'Kode COA tidak ditemukan di Chart of Accounts' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.coa_dana) return NextResponse.json({ error: 'COA is required' }, { status: 400 });

    const data = schema.omit({ coa_dana: true }).partial().parse(body);
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

    params.push(body.coa_dana);
    const res = await query(
      `UPDATE fins_saldo_dana SET ${fields.join(', ')} WHERE coa_dana = $${idx} RETURNING *`,
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
    const coaDana = searchParams.get('coa_dana');
    const coaDanaList = searchParams.get('coa_dana_list');

    if (coaDanaList) {
      const list = coaDanaList.split(',').filter(Boolean);
      if (list.length === 0) return NextResponse.json({ error: 'No data to delete' }, { status: 400 });
      await query(`DELETE FROM fins_saldo_dana WHERE coa_dana = ANY($1::varchar[])`, [list]);
      return NextResponse.json({ success: true, deleted: list.length });
    }

    if (!coaDana) return NextResponse.json({ error: 'COA is required' }, { status: 400 });
    await query(`DELETE FROM fins_saldo_dana WHERE coa_dana = $1`, [coaDana]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
