import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { donorWriteSchema } from '@/lib/crm/donor-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

async function assertRefs(data: z.output<typeof donorWriteSchema>, donorId: number) {
  if (data.tim_crm_id) {
    const team = await query('SELECT id FROM crm_teams WHERE id = $1', [data.tim_crm_id]);
    if (team.rowCount === 0) return 'Tim CRM tidak ditemukan';
  }
  if (data.kantor_id) {
    try {
      const office = await query('SELECT id FROM fins_kantor WHERE id = $1', [data.kantor_id]);
      if (office.rowCount === 0) return 'Kantor tidak ditemukan';
    } catch (error: any) {
      if (error?.code !== '42P01') throw error;
    }
  }
  if (data.nik) {
    const nik = await query('SELECT id FROM donors WHERE nik = $1 AND id <> $2', [data.nik, donorId]);
    if ((nik.rowCount ?? 0) > 0) return 'NIK sudah dipakai donatur lain';
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse({ id: rawId });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const donorRes = await query(
      `SELECT d.id, d.name, d.email, d.phone, d.created_at, d.jenis, d.jenis_kelamin,
              d.alamat, d.nik, d.status_aktif, d.kantor_id, d.tim_crm_id, t.nama AS tim_crm_nama,
              d.minat_program, d.verified_at, d.merged_into_id
       FROM donors d
       LEFT JOIN crm_teams t ON t.id = d.tim_crm_id
       WHERE d.id = $1`,
      [parsedId.data.id]
    );
    if (donorRes.rowCount === 0) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });

    const [invoicesRes, aggRes] = await Promise.all([
      query(
        `SELECT i.id, i.invoice_code, i.total_amount, i.status, i.created_at, i.paid_at,
                pm.name AS payment_method_name, c.title AS campaign_title
         FROM invoices i
         LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
         LEFT JOIN transactions t ON i.id = t.invoice_id AND i.created_at = t.invoice_created_at
         LEFT JOIN campaigns c ON t.campaign_id = c.id
         WHERE i.donor_id = $1
         ORDER BY i.created_at DESC`,
        [parsedId.data.id]
      ),
      query(
        `SELECT COUNT(id)::int AS total_invoices,
                COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END), 0) AS total_donated,
                COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int AS paid_invoices
         FROM invoices
         WHERE donor_id = $1`,
        [parsedId.data.id]
      ),
    ]);

    return NextResponse.json({
      ...donorRes.rows[0],
      stats: aggRes.rows[0],
      invoices: invoicesRes.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse({ id: rawId });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  const parsed = await parseBody(req, donorWriteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const current = await query('SELECT id, verified_at FROM donors WHERE id = $1', [parsedId.data.id]);
    if (current.rowCount === 0) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });

    const problem = await assertRefs(parsed.data, parsedId.data.id);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const verifiedAt = parsed.data.terverifikasi ? (current.rows[0].verified_at ?? new Date()) : null;
    const res = await query(
      `UPDATE donors SET
         name = $1, email = $2, phone = $3, jenis = $4, jenis_kelamin = $5, alamat = $6,
         nik = $7, status_aktif = $8, kantor_id = $9, tim_crm_id = $10, minat_program = $11,
         verified_at = $12
       WHERE id = $13
       RETURNING id, name, email, phone, created_at, jenis, jenis_kelamin, alamat, nik,
                 status_aktif, kantor_id, tim_crm_id, minat_program, verified_at, merged_into_id`,
      [
        parsed.data.name,
        parsed.data.email,
        parsed.data.phone,
        parsed.data.jenis,
        parsed.data.jenis_kelamin,
        parsed.data.alamat,
        parsed.data.nik,
        parsed.data.status_aktif,
        parsed.data.kantor_id,
        parsed.data.tim_crm_id,
        parsed.data.minat_program,
        verifiedAt,
        parsedId.data.id,
      ]
    );
    await invalidateCache(['api:crm:donors', 'api:donors', 'donors']);
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
