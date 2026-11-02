import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode, requestDecisionSchema } from '@/lib/penyaluran/request-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const DETAIL_SQL = `
  SELECT r.*, c.title AS campaign_title, b.nama_lengkap AS beneficiary_nama, b.kode_beneficiary
  FROM disbursement_requests r
  LEFT JOIN campaigns c ON c.id = r.campaign_id
  LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
  WHERE r.id = $1
`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const res = await query(DETAIL_SQL, [parsedId.data.id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  const parsed = await parseBody(req, requestDecisionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const current = await query(
      'SELECT id, status, jumlah_diajukan FROM disbursement_requests WHERE id = $1',
      [parsedId.data.id]
    );
    if (current.rowCount === 0) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });

    const row = current.rows[0];
    const actor = actorCode(session.user?.name);
    let sql = '';
    let paramsSql: unknown[] = [];

    if (parsed.data.action === 'approve') {
      if (!['submitted', 'reviewed'].includes(row.status)) {
        return NextResponse.json({ error: 'Hanya pengajuan yang diajukan yang bisa disetujui' }, { status: 409 });
      }
      const jumlah = parsed.data.jumlah_disetujui ?? Number(row.jumlah_diajukan);
      if (jumlah > Number(row.jumlah_diajukan)) {
        return NextResponse.json({ error: 'Jumlah disetujui tidak boleh melebihi jumlah diajukan' }, { status: 400 });
      }
      sql = `UPDATE disbursement_requests
             SET status = 'approved', jumlah_disetujui = $1, nik_approver = $2,
                 tgl_approval = NOW(), catatan_approver = $3, updated_at = NOW()
             WHERE id = $4 AND status IN ('submitted', 'reviewed')
             RETURNING id, nomor_pengajuan, status, jumlah_disetujui`;
      paramsSql = [jumlah, actor, parsed.data.catatan, parsedId.data.id];
    } else if (parsed.data.action === 'reject') {
      if (!['draft', 'submitted', 'reviewed'].includes(row.status)) {
        return NextResponse.json({ error: 'Pengajuan pada status ini tidak bisa ditolak' }, { status: 409 });
      }
      sql = `UPDATE disbursement_requests
             SET status = 'rejected', nik_approver = $1, tgl_approval = NOW(),
                 catatan_approver = $2, updated_at = NOW()
             WHERE id = $3 AND status IN ('draft', 'submitted', 'reviewed')
             RETURNING id, nomor_pengajuan, status`;
      paramsSql = [actor, parsed.data.catatan, parsedId.data.id];
    } else {
      if (!['draft', 'rejected'].includes(row.status)) {
        return NextResponse.json({ error: 'Pengajuan ini sudah tidak berstatus draf atau ditolak' }, { status: 409 });
      }
      sql = `UPDATE disbursement_requests
             SET status = 'submitted', updated_at = NOW()
             WHERE id = $1 AND status IN ('draft', 'rejected')
             RETURNING id, nomor_pengajuan, status`;
      paramsSql = [parsedId.data.id];
    }

    const updated = await query(sql, paramsSql);
    if (updated.rowCount === 0) {
      return NextResponse.json({ error: 'Status berubah sebelum aksi ini disimpan' }, { status: 409 });
    }
    await invalidateCache(['api:penyaluran:requests']);
    return NextResponse.json(updated.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
