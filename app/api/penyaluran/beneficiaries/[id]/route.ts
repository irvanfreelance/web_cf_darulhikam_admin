import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import {
  BENEFICIARY_WRITE_COLUMNS,
  beneficiaryWriteSchema,
  roundCoord,
  type BeneficiaryWrite,
} from '@/lib/penyaluran/beneficiary-schema';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

function columnValues(data: BeneficiaryWrite, kode: string) {
  return BENEFICIARY_WRITE_COLUMNS.map((column) => {
    if (column === 'kode_beneficiary') return kode;
    if (column === 'latitude') return roundCoord(data.latitude);
    if (column === 'longitude') return roundCoord(data.longitude);
    return data[column];
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse({ id: rawId });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

  try {
    const res = await query(
      `SELECT * FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL`,
      [parsedId.data.id]
    );
    if (res.rowCount === 0) return NextResponse.json({ error: 'Penerima manfaat tidak ditemukan' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
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

  const parsed = await parseBody(req, beneficiaryWriteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const current = await query(
      `SELECT id, kode_beneficiary, status_verifikasi, verified_by, verified_at
       FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL`,
      [parsedId.data.id]
    );
    if (current.rowCount === 0) return NextResponse.json({ error: 'Penerima manfaat tidak ditemukan' }, { status: 404 });

    if (parsed.data.campaign_id) {
      const campaign = await query('SELECT id FROM campaigns WHERE id = $1', [parsed.data.campaign_id]);
      if (campaign.rowCount === 0) return NextResponse.json({ error: 'Kampanye tidak ditemukan' }, { status: 400 });
    }

    const existing = current.rows[0];
    const kode = parsed.data.kode_beneficiary || existing.kode_beneficiary;
    const values = columnValues(parsed.data, kode);
    const sets = BENEFICIARY_WRITE_COLUMNS.map((column, index) => `${column} = $${index + 1}`);
    let verifiedBy = existing.verified_by;
    let verifiedAt = existing.verified_at;
    if (parsed.data.status_verifikasi === 'verified' && existing.status_verifikasi !== 'verified') {
      verifiedBy = (session.user?.name || 'admin').slice(0, 20);
      verifiedAt = new Date();
    }
    const verifiedByIdx = values.length + 1;
    const verifiedAtIdx = values.length + 2;
    const updatedIdx = values.length + 3;
    const idIdx = values.length + 4;

    const res = await query(
      `UPDATE beneficiaries SET
         ${sets.join(', ')},
         verified_by = $${verifiedByIdx},
         verified_at = $${verifiedAtIdx},
         updated_at = $${updatedIdx}
       WHERE id = $${idIdx} AND deleted_at IS NULL
       RETURNING *`,
      [...values, verifiedBy, verifiedAt, new Date(), parsedId.data.id]
    );
    await invalidateCache(['api:penyaluran:beneficiaries', 'api:beneficiaries']);
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
