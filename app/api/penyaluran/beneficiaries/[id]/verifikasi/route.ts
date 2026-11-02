import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { verifikasiSchema } from '@/lib/penyaluran/beneficiary-schema';
import { actorCode } from '@/lib/penyaluran/request-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  const parsed = await parseBody(req, verifikasiSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const current = await query(
      `SELECT id, status_verifikasi FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL`,
      [parsedId.data.id]
    );
    if (current.rowCount === 0) return NextResponse.json({ error: 'Penerima manfaat tidak ditemukan' }, { status: 404 });

    const actor = actorCode(session.user?.name);
    const decided = parsed.data.status_verifikasi !== 'unverified';
    const res = await query(
      `UPDATE beneficiaries SET
         status_verifikasi = $1,
         catatan_verifikasi = $2,
         verifikasi_tempat_tinggal = $3,
         verifikasi_penghasilan = $4,
         verifikasi_tanggungan = $5,
         verifikasi_aset = $6,
         verifikasi_dokumen = $7,
         verifikasi_keputusan = $8,
         verified_by = $9,
         verified_at = $10,
         updated_at = NOW()
       WHERE id = $11 AND deleted_at IS NULL
       RETURNING id, kode_beneficiary, nama_lengkap, status_verifikasi, verified_by, verified_at, catatan_verifikasi, verifikasi_keputusan`,
      [
        parsed.data.status_verifikasi,
        parsed.data.catatan_verifikasi,
        parsed.data.verifikasi_tempat_tinggal,
        parsed.data.verifikasi_penghasilan,
        parsed.data.verifikasi_tanggungan,
        parsed.data.verifikasi_aset,
        parsed.data.verifikasi_dokumen,
        parsed.data.verifikasi_keputusan,
        decided ? actor : null,
        decided ? new Date() : null,
        parsedId.data.id,
      ]
    );
    await invalidateCache(['api:penyaluran:beneficiaries', 'api:beneficiaries']);
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
