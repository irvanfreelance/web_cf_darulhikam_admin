import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { calculateDepreciationSchedule } from '@/lib/fins/depreciation';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const updateAsetSchema = z.object({
  aset: z.string().trim().min(3, 'Nama aset minimal 3 karakter').max(200),
  coa: z.string().trim().min(1, 'Akun aset wajib dipilih'),
  coaDebit: z.string().trim().min(1, 'Akun beban penyusutan wajib dipilih'),
  coaKredit: z.string().trim().min(1, 'Akun akumulasi penyusutan wajib dipilih'),
  deskripsi: z.string().trim().optional().default(''),
  idKantor: z.coerce.number().int().positive().default(1),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const asetId = Number(id);
  if (!asetId || isNaN(asetId)) {
    return NextResponse.json({ error: 'ID Aset tidak valid' }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT a.*, k.nama AS kantor_nama,
              COALESCE((SELECT SUM(nilai_susut) FROM asset_depreciation_schedules WHERE fins_aset_id = a.id AND status = 'posted'), 0)::numeric AS akumulasi_posted,
              (SELECT COUNT(*) FROM asset_depreciation_schedules WHERE fins_aset_id = a.id)::int AS total_jadwal,
              (SELECT COUNT(*) FROM asset_depreciation_schedules WHERE fins_aset_id = a.id AND status = 'posted')::int AS jadwal_posted
       FROM fins_aset a
       LEFT JOIN fins_kantor k ON k.id = a.id_kantor
       WHERE a.id = $1 AND a.deleted = 'n'`,
      [asetId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  const { id } = await params;
  const asetId = Number(id);
  if (!asetId || isNaN(asetId)) {
    return NextResponse.json({ error: 'ID Aset tidak valid' }, { status: 400 });
  }

  try {
    const rawBody = await req.json();
    const validated = updateAsetSchema.parse(rawBody);

    const result = await withTransaction(async (client) => {
      // Pastikan ada
      const check = await client.query(`SELECT id FROM fins_aset WHERE id = $1 AND deleted = 'n'`, [asetId]);
      if (check.rowCount === 0) {
        throw new Error('Aset tidak ditemukan');
      }

      const updateRes = await client.query(
        `UPDATE fins_aset
         SET aset = $1, coa = $2, coa_debit = $3, coa_kredit = $4, deskripsi = $5, id_kantor = $6,
             user_update = $7
         WHERE id = $8 AND deleted = 'n'
         RETURNING *`,
        [
          validated.aset,
          validated.coa,
          validated.coaDebit,
          validated.coaKredit,
          validated.deskripsi,
          validated.idKantor,
          userName.slice(0, 50),
          asetId,
        ]
      );

      return updateRes.rows[0];
    });

    try {
      await invalidateCache(['fins:aset:*']);
    } catch (e) {
      console.warn('Redis flush error in aset put:', e);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  const { id } = await params;
  const asetId = Number(id);
  if (!asetId || isNaN(asetId)) {
    return NextResponse.json({ error: 'ID Aset tidak valid' }, { status: 400 });
  }

  try {
    await withTransaction(async (client) => {
      // Cek apakah ada jadwal penyusutan yang sudah posted
      const postedCheck = await client.query(
        `SELECT id FROM asset_depreciation_schedules WHERE fins_aset_id = $1 AND status = 'posted' LIMIT 1`,
        [asetId]
      );
      if (postedCheck.rowCount && postedCheck.rowCount > 0) {
        throw new Error('Aset tidak dapat dihapus karena sudah memiliki jadwal penyusutan yang terposting jurnal.');
      }

      // Soft delete fins_aset (deleted = 'y')
      await client.query(
        `UPDATE fins_aset SET deleted = 'y', user_update = $1 WHERE id = $2`,
        [userName.slice(0, 50), asetId]
      );
    });

    try {
      await invalidateCache(['fins:aset:*']);
    } catch (e) {
      console.warn('Redis flush error in aset delete:', e);
    }

    return NextResponse.json({ success: true, message: 'Aset berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

