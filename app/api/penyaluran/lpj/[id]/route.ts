import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const reviewSchema = z.object({
  action: z.enum(['approve', 'revisi', 'submit']),
  catatan_review: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const res = await query(
      `SELECT l.*, r.nomor_pengajuan, r.judul AS request_judul, r.jumlah_disetujui, r.jumlah_diajukan,
              r.status AS request_status, c.title AS campaign_title, b.nama_lengkap AS beneficiary_nama
       FROM disbursement_lpj l
       JOIN disbursement_requests r ON r.id = l.request_id
       LEFT JOIN campaigns c ON c.id = r.campaign_id
       LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
       WHERE l.id = $1`,
      [parsedId.data.id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'LPJ tidak ditemukan' }, { status: 404 });
    }

    const row = res.rows[0];

    // Ambil bukti berkas
    const proofs = await query(
      `SELECT id, jenis_dokumen, file_url, caption, uploaded_by, uploaded_at
       FROM disbursement_proofs
       WHERE disbursement_request_id = $1
       ORDER BY id ASC`,
      [row.request_id]
    );

    // Ambil daftar penerima jika ada
    const recipients = await query(
      `SELECT id, nama_penerima, jumlah_diterima, lokasi_penyaluran, satuan
       FROM disbursement_recipients
       WHERE disbursement_request_id = $1
       ORDER BY id ASC`,
      [row.request_id]
    );

    return NextResponse.json({
      lpj: {
        ...row,
        jumlah_realisasi: Number(row.jumlah_realisasi || 0),
        jumlah_disetujui: Number(row.jumlah_disetujui || row.jumlah_diajukan || 0),
      },
      proofs: proofs.rows,
      recipients: recipients.rows,
    });
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

  const parsed = await parseBody(req, reviewSchema);
  if (!parsed.ok) return parsed.response;

  const actor = actorCode(session.user?.name);

  try {
    const updated = await withTransaction(async (client) => {
      const lockRes = await client.query(
        `SELECT id, status, request_id FROM disbursement_lpj WHERE id = $1 FOR UPDATE`,
        [parsedId.data.id]
      );

      if (lockRes.rowCount === 0) throw new Error('LPJ tidak ditemukan');
      const row = lockRes.rows[0];

      let nextStatus = 'draft';
      if (parsed.data.action === 'approve') nextStatus = 'approved';
      else if (parsed.data.action === 'revisi') nextStatus = 'revisi';
      else if (parsed.data.action === 'submit') nextStatus = 'submitted';

      const updateRes = await client.query(
        `UPDATE disbursement_lpj
         SET status = $1, reviewer = $2, catatan_review = $3
         WHERE id = $4
         RETURNING id, status, reviewer, catatan_review`,
        [nextStatus, actor, parsed.data.catatan_review || null, parsedId.data.id]
      );

      return updateRes.rows[0];
    });

    await invalidateCache(['api:penyaluran:lpj', 'api:penyaluran:dashboard']);
    return NextResponse.json(updated);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

