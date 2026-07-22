import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const schema = z.object({
  title: z.string().min(3),
  report_type: z.enum(['annual','quarterly','monthly','special_audit']).default('annual'),
  period_label: z.string().min(2),
  period_year: z.number().int().min(2000).max(2100),
  period_quarter: z.number().int().min(1).max(4).optional().nullable(),
  audit_status: z.enum(['unaudited','internally_reviewed','kap_audited']).default('unaudited'),
  file_url: z.string().min(1),
  file_size_kb: z.number().int().default(0),
  is_published: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    let sql = `SELECT * FROM web_financial_reports`;
    const params: any[] = [];
    if (search) {
      sql += ` WHERE (title ILIKE $1 OR period_label ILIKE $1)`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY period_year DESC, period_quarter DESC NULLS LAST, id DESC LIMIT 100`;
    const data = await query(sql, params);
    return NextResponse.json(data.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let uploaded_by = 1; // default to first admin if no session
    if (session?.user?.email) {
      const adminRes = await query(`SELECT id FROM admins WHERE email = $1 LIMIT 1`, [session.user.email]);
      if (adminRes.rowCount && adminRes.rowCount > 0) uploaded_by = adminRes.rows[0].id;
    }

    const body = await req.json();
    const data = schema.parse(body);
    
    const res = await query(
      `INSERT INTO web_financial_reports 
       (title, report_type, period_label, period_year, period_quarter, audit_status, file_url, file_size_kb, is_published, uploaded_by, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [
        data.title, data.report_type, data.period_label, data.period_year, data.period_quarter,
        data.audit_status, data.file_url, data.file_size_kb, data.is_published, uploaded_by
      ]
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
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
      `UPDATE web_financial_reports SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    await query(`DELETE FROM web_financial_reports WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
