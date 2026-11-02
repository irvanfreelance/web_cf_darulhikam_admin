import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode, realisasiSchema } from '@/lib/penyaluran/request-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const request = await query('SELECT id, status FROM disbursement_requests WHERE id = $1', [parsedId.data.id]);
    if (request.rowCount === 0) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });
    const [lpj, penerima, bukti] = await Promise.all([
      query(
        `SELECT id, judul, tgl_kegiatan, jumlah_realisasi, narasi, disusun_oleh, status, created_at
         FROM disbursement_lpj WHERE request_id = $1 ORDER BY id DESC LIMIT 1`,
        [parsedId.data.id]
      ),
      query(
        `SELECT id, beneficiary_id, nama_penerima, jumlah_diterima, tgl_terima
         FROM disbursement_recipients WHERE disbursement_request_id = $1 ORDER BY id ASC`,
        [parsedId.data.id]
      ),
      query(
        `SELECT id, jenis_dokumen, file_url, caption, uploaded_by, uploaded_at
         FROM disbursement_proofs WHERE disbursement_request_id = $1 ORDER BY id ASC`,
        [parsedId.data.id]
      ),
    ]);
    return NextResponse.json({
      status: request.rows[0].status,
      lpj: lpj.rows[0] ?? null,
      penerima: penerima.rows,
      bukti: bukti.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  const parsed = await parseBody(req, realisasiSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const ids = parsed.data.penerima.map((row) => row.beneficiary_id).filter((value): value is number => value != null);
    if (ids.length) {
      const found = await query('SELECT id FROM beneficiaries WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL', [ids]);
      if ((found.rowCount ?? 0) !== new Set(ids).size) {
        return NextResponse.json({ error: 'Ada penerima manfaat yang tidak ditemukan' }, { status: 400 });
      }
    }

    const actor = actorCode(session.user?.name);
    const penulis = (session.user?.name || 'admin').slice(0, 150);
    const saved = await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT id, status, judul, nomor_pengajuan FROM disbursement_requests WHERE id = $1 FOR UPDATE`,
        [parsedId.data.id]
      );
      if (current.rowCount === 0) {
        const error = new Error('Pengajuan tidak ditemukan') as Error & { status?: number };
        error.status = 404;
        throw error;
      }
      if (current.rows[0].status !== 'approved') {
        const error = new Error('Hanya pengajuan berstatus disetujui yang bisa dicatat realisasinya') as Error & { status?: number };
        error.status = 409;
        throw error;
      }

      await client.query(
        `UPDATE disbursement_requests
         SET status = 'disbursed', tgl_realisasi = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'approved'`,
        [parsed.data.tgl_kegiatan, parsedId.data.id]
      );

      const judul = parsed.data.judul || `LPJ ${current.rows[0].nomor_pengajuan}`;
      const lpj = await client.query(
        `INSERT INTO disbursement_lpj (request_id, judul, tgl_kegiatan, jumlah_realisasi, narasi, disusun_oleh, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'selesai')
         RETURNING id`,
        [parsedId.data.id, judul, parsed.data.tgl_kegiatan, parsed.data.jumlah_realisasi, parsed.data.narasi, penulis]
      );

      for (const penerima of parsed.data.penerima) {
        await client.query(
          `INSERT INTO disbursement_recipients (
             disbursement_request_id, beneficiary_id, nama_penerima, jumlah_diterima, tgl_terima
           ) VALUES ($1, $2, $3, $4, $5)`,
          [parsedId.data.id, penerima.beneficiary_id, penerima.nama_penerima, penerima.jumlah_diterima, parsed.data.tgl_kegiatan]
        );
      }
      for (const bukti of parsed.data.bukti) {
        await client.query(
          `INSERT INTO disbursement_proofs (disbursement_request_id, jenis_dokumen, file_url, caption, uploaded_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [parsedId.data.id, bukti.jenis_dokumen, bukti.file_url, bukti.caption, actor]
        );
      }
      return { id: parsedId.data.id, status: 'disbursed', lpj_id: lpj.rows[0].id };
    });

    await invalidateCache(['api:penyaluran:requests', 'api:penyaluran:dashboard']);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    if (error?.status) return NextResponse.json({ error: error.message }, { status: error.status });
    return dbErrorResponse(error);
  }
}
