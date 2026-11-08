import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';

const mergeSchema = z.object({
  survivor_id: z.coerce.number().int().positive('ID Donatur Utama tidak valid'),
  merged_id: z.coerce.number().int().positive('ID Donatur yang Digabung tidak valid'),
}).refine((data) => data.survivor_id !== data.merged_id, {
  message: 'Donatur utama dan donatur yang digabung tidak boleh sama',
  path: ['merged_id'],
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, mergeSchema);
  if (!parsed.ok) return parsed.response;

  const { survivor_id, merged_id } = parsed.data;
  const actor = actorCode(session.user?.name);

  try {
    const result = await withTransaction(async (client) => {
      // 1. Lock kedua donor untuk mencegah race condition
      const lockRes = await client.query(
        `SELECT id, name, phone, email, nik, merged_into_id, status_aktif
         FROM donors
         WHERE id IN ($1, $2)
         FOR UPDATE`,
        [survivor_id, merged_id]
      );

      if (lockRes.rowCount < 2) {
        throw new Error('Salah satu atau kedua donatur tidak ditemukan');
      }

      const survivor = lockRes.rows.find((r: any) => Number(r.id) === survivor_id);
      const merged = lockRes.rows.find((r: any) => Number(r.id) === merged_id);

      if (survivor.merged_into_id) {
        throw new Error('Donatur utama sudah pernah digabung ke donatur lain');
      }
      if (merged.merged_into_id) {
        throw new Error('Donatur yang akan digabung sudah pernah digabung sebelumnya');
      }

      // 2. Cari semua invoice dari merged donor (bawa id dan created_at karena tabel partisi)
      const invRes = await client.query(
        `SELECT id, created_at FROM invoices WHERE donor_id = $1`,
        [merged_id]
      );

      // Pindahkan invoice per baris dengan created_at (PARTITION SAFE)
      for (const inv of invRes.rows) {
        await client.query(
          `UPDATE invoices SET donor_id = $1 WHERE id = $2 AND created_at = $3`,
          [survivor_id, inv.id, inv.created_at]
        );
      }

      // 3. Pindahkan jadwal rutin jika ada
      await client.query(
        `UPDATE donor_routines SET donor_id = $1 WHERE donor_id = $2`,
        [survivor_id, merged_id]
      );

      // 4. Update status merged donor
      await client.query(
        `UPDATE donors
         SET merged_into_id = $1, status_aktif = false, updated_at = NOW()
         WHERE id = $2`,
        [survivor_id, merged_id]
      );

      // 5. Catat log penggabungan
      await client.query(
        `INSERT INTO donor_merge_log (survivor_id, merged_id, actor, merged_at)
         VALUES ($1, $2, $3, NOW())`,
        [survivor_id, merged_id, actor]
      );

      return {
        success: true,
        invoices_moved: invRes.rowCount,
        survivor_id,
        merged_id,
      };
    });

    await invalidateCache(['api:crm:donors', 'crm:*', 'invoices']);
    return NextResponse.json(result);
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
