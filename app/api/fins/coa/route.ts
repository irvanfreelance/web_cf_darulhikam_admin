import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  coa: z.string().min(1).max(14),
  nama_coa: z.string().min(2).max(200),
  coa_parent: z.string().optional().default(''),
  group_coa: z.string().optional().default(''),
  id_kantor: z.string().optional().default(''),
  id_jabatan: z.string().optional().default(''),
  active: z.enum(['y', 'n']).default('y'),
  saldo: z.enum(['d', 'k']),
  is_postable: z.boolean().default(true),
});

async function computeLevel(coaParent: string): Promise<number> {
  if (!coaParent || coaParent === '0') return 1;
  const res = await query(`SELECT level FROM fins_coa WHERE coa = $1`, [coaParent]);
  if (res.rows.length === 0) throw Object.assign(new Error('COA Parent tidak ditemukan'), { code: 'PARENT_NOT_FOUND' });
  return Number(res.rows[0].level) + 1;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const group = searchParams.get('group');
    const parent = searchParams.get('parent');
    const active = searchParams.get('active');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.coa ILIKE $${params.length} OR c.nama_coa ILIKE $${params.length})`);
    }
    if (group && group !== 'all') {
      const escapedGroup = group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      params.push(`(^|,)${escapedGroup}(,|$)`);
      conditions.push(`c.group_coa ~ $${params.length}`);
    }
    if (parent && parent !== 'all') {
      if (parent === 'root') {
        conditions.push(`(c.coa_parent = '' OR c.coa_parent = '0')`);
      } else {
        params.push(parent);
        conditions.push(`c.coa_parent = $${params.length}`);
      }
    }
    if (active && active !== 'all') {
      params.push(active);
      conditions.push(`c.active = $${params.length}`);
    }
    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const baseSql = `
      FROM fins_coa c
      LEFT JOIN fins_kantor k ON k.id::text = c.id_kantor
      LEFT JOIN fins_jabatan j ON j.id::text = c.id_jabatan
      ${whereSql}
    `;

    const dataParams = [...params, limit, offset];
    const [countRes, dataRes, groupsRes] = await Promise.all([
      query(`SELECT COUNT(*) ${baseSql}`, params),
      query(
        `SELECT c.*, k.nama AS kantor_nama, j.nama AS jabatan_nama
         ${baseSql}
         ORDER BY c.coa ASC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      ),
      query(`SELECT DISTINCT group_coa FROM fins_coa WHERE group_coa != ''`),
    ]);

    const groupSet = new Set<string>();
    for (const row of groupsRes.rows) {
      String(row.group_coa).split(',').map(g => g.trim()).filter(Boolean).forEach(g => groupSet.add(g));
    }

    return NextResponse.json({
      rows: dataRes.rows,
      totalCount: parseInt(countRes.rows[0].count, 10),
      groups: Array.from(groupSet).sort(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const level = await computeLevel(data.coa_parent);

    const res = await query(
      `INSERT INTO fins_coa (coa, nama_coa, coa_parent, level, id_kantor, id_jabatan, group_coa, parent, active, saldo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [data.coa, data.nama_coa, data.coa_parent, level, data.id_kantor, data.id_jabatan, data.group_coa, data.is_postable ? 'n' : 'y', data.active, data.saldo]
    );

    if (data.coa_parent && data.coa_parent !== '0') {
      await query(`UPDATE fins_coa SET parent = 'y' WHERE coa = $1`, [data.coa_parent]);
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === 'PARENT_NOT_FOUND') return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === '23505') return NextResponse.json({ error: 'Kode COA sudah digunakan' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.coa) return NextResponse.json({ error: 'Kode COA is required' }, { status: 400 });

    const data = schema.omit({ coa: true }).partial().parse(body);

    const existingRes = await query(`SELECT coa_parent FROM fins_coa WHERE coa = $1`, [body.coa]);
    if (existingRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const oldParent = existingRes.rows[0].coa_parent;

    let level: number | undefined;
    if (data.coa_parent !== undefined) {
      level = await computeLevel(data.coa_parent);
    }

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, any> = { ...data };
    if (fieldMap.is_postable !== undefined) {
      fieldMap.parent = fieldMap.is_postable ? 'n' : 'y';
      delete fieldMap.is_postable;
    }
    if (level !== undefined) fieldMap.level = level;

    for (const [key, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    if (fields.length === 0) return NextResponse.json({ error: 'No data to update' }, { status: 400 });

    params.push(body.coa);
    const res = await query(
      `UPDATE fins_coa SET ${fields.join(', ')} WHERE coa = $${idx} RETURNING *`,
      params
    );

    if (data.coa_parent !== undefined && data.coa_parent !== oldParent) {
      if (data.coa_parent && data.coa_parent !== '0') {
        await query(`UPDATE fins_coa SET parent = 'y' WHERE coa = $1`, [data.coa_parent]);
      }
      if (oldParent && oldParent !== '0') {
        const stillHasChildren = await query(`SELECT 1 FROM fins_coa WHERE coa_parent = $1 LIMIT 1`, [oldParent]);
        if (stillHasChildren.rows.length === 0) {
          await query(`UPDATE fins_coa SET parent = 'n' WHERE coa = $1`, [oldParent]);
        }
      }
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error.code === 'PARENT_NOT_FOUND') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const coa = searchParams.get('coa');
    if (!coa) return NextResponse.json({ error: 'Kode COA is required' }, { status: 400 });

    const children = await query(`SELECT 1 FROM fins_coa WHERE coa_parent = $1 LIMIT 1`, [coa]);
    if (children.rows.length > 0) {
      return NextResponse.json({ error: 'Hapus dulu akun anak di bawahnya terlebih dahulu' }, { status: 400 });
    }

    await query(`DELETE FROM fins_coa WHERE coa = $1`, [coa]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23503') return NextResponse.json({ error: 'Akun ini masih digunakan di data lain dan tidak bisa dihapus' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
