import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Duplikat berdasarkan nomor HP (diambil nomor yang digitnya >= 8)
    const phoneRes = await query(`
      SELECT phone, COUNT(*) AS count, array_agg(id ORDER BY id ASC) AS ids
      FROM donors
      WHERE phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 8
        AND merged_into_id IS NULL
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    // 2. Duplikat berdasarkan Email
    const emailRes = await query(`
      SELECT LOWER(email) AS email, COUNT(*) AS count, array_agg(id ORDER BY id ASC) AS ids
      FROM donors
      WHERE email IS NOT NULL AND TRIM(email) <> '' AND merged_into_id IS NULL
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    // 3. Duplikat berdasarkan NIK
    const nikRes = await query(`
      SELECT nik, COUNT(*) AS count, array_agg(id ORDER BY id ASC) AS ids
      FROM donors
      WHERE nik IS NOT NULL AND TRIM(nik) <> '' AND merged_into_id IS NULL
      GROUP BY nik
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    // Kumpulkan semua candidate IDs untuk mengambil profil lengkap & total donasi invoice PAID
    const allIds = Array.from(
      new Set([
        ...phoneRes.rows.flatMap((r) => r.ids),
        ...emailRes.rows.flatMap((r) => r.ids),
        ...nikRes.rows.flatMap((r) => r.ids),
      ])
    );

    let donorDetails: Record<string, any> = {};
    if (allIds.length > 0) {
      const detailsRes = await query(
        `SELECT d.id, d.name, d.phone, d.email, d.nik, d.created_at, d.verified_at,
                COALESCE((
                  SELECT SUM(COALESCE(i.base_amount, i.total_amount, 0))
                  FROM invoices i
                  WHERE i.donor_id = d.id AND i.status = 'PAID'
                ), 0) AS total_donasi,
                COALESCE((
                  SELECT COUNT(*)
                  FROM invoices i
                  WHERE i.donor_id = d.id AND i.status = 'PAID'
                ), 0) AS jumlah_transaksi
         FROM donors d
         WHERE d.id = ANY($1::bigint[])`,
        [allIds]
      );
      for (const row of detailsRes.rows) {
        donorDetails[row.id] = {
          ...row,
          total_donasi: Number(row.total_donasi),
          jumlah_transaksi: Number(row.jumlah_transaksi),
        };
      }
    }

    // Riwayat merge log terbaru
    const historyRes = await query(`
      SELECT ml.id, ml.survivor_id, ml.merged_id, ml.merged_at, ml.actor,
             ds.name AS survivor_nama, dm.name AS merged_nama
      FROM donor_merge_log ml
      LEFT JOIN donors ds ON ds.id = ml.survivor_id
      LEFT JOIN donors dm ON dm.id = ml.merged_id
      ORDER BY ml.merged_at DESC
      LIMIT 20
    `);

    return NextResponse.json({
      by_phone: phoneRes.rows.map((r) => ({ key: r.phone, count: Number(r.count), donors: r.ids.map((id: number) => donorDetails[id]).filter(Boolean) })),
      by_email: emailRes.rows.map((r) => ({ key: r.email, count: Number(r.count), donors: r.ids.map((id: number) => donorDetails[id]).filter(Boolean) })),
      by_nik: nikRes.rows.map((r) => ({ key: r.nik, count: Number(r.count), donors: r.ids.map((id: number) => donorDetails[id]).filter(Boolean) })),
      history: historyRes.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

