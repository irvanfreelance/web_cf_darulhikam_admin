import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Distribusi per Jenis Donatur
    const jenisRes = await query(`
      SELECT COALESCE(jenis, 'perorangan') AS jenis, COUNT(*) AS count
      FROM donors
      WHERE merged_into_id IS NULL
      GROUP BY COALESCE(jenis, 'perorangan')
    `);

    // 2. Distribusi per Jenis Kelamin
    const genderRes = await query(`
      SELECT 
        CASE 
          WHEN jenis_kelamin = 'L' THEN 'Laki-laki'
          WHEN jenis_kelamin = 'P' THEN 'Perempuan'
          ELSE 'Belum Mengisi'
        END AS gender,
        COUNT(*) AS count
      FROM donors
      WHERE merged_into_id IS NULL
      GROUP BY jenis_kelamin
    `);

    // 3. Distribusi per Kantor Operasional
    const kantorRes = await query(`
      SELECT COALESCE(k.nama, 'Pusat / Tanpa Kantor') AS kantor, COUNT(d.id) AS count
      FROM donors d
      LEFT JOIN fins_kantor k ON k.id = d.kantor_id
      WHERE d.merged_into_id IS NULL
      GROUP BY COALESCE(k.nama, 'Pusat / Tanpa Kantor')
      ORDER BY count DESC
      LIMIT 10
    `);

    // 4. Distribusi per Minat Program
    const minatRes = await query(`
      SELECT COALESCE(NULLIF(TRIM(minat_program), ''), 'Umum / Belum Memilih') AS minat, COUNT(*) AS count
      FROM donors
      WHERE merged_into_id IS NULL
      GROUP BY COALESCE(NULLIF(TRIM(minat_program), ''), 'Umum / Belum Memilih')
      ORDER BY count DESC
      LIMIT 8
    `);

    // 5. Segmentasi Nominal Donasi Donatur (RFM / Value tier)
    const tierRes = await query(`
      WITH donor_totals AS (
        SELECT d.id, COALESCE(SUM(COALESCE(i.base_amount, i.total_amount, 0)), 0) AS total_nominal
        FROM donors d
        LEFT JOIN invoices i ON i.donor_id = d.id AND i.status = 'PAID'
        WHERE d.merged_into_id IS NULL
        GROUP BY d.id
      )
      SELECT
        CASE
          WHEN total_nominal = 0 THEN 'Prospek (Rp0)'
          WHEN total_nominal < 500000 THEN 'Silver (< Rp500rb)'
          WHEN total_nominal < 5000000 THEN 'Gold (Rp500rb - Rp5jt)'
          ELSE 'Platinum (> Rp5jt)'
        END AS tier,
        COUNT(*) AS count,
        SUM(total_nominal) AS total_donasi
      FROM donor_totals
      GROUP BY 1
      ORDER BY MIN(total_nominal) ASC
    `);

    return NextResponse.json({
      jenis: jenisRes.rows,
      gender: genderRes.rows,
      kantor: kantorRes.rows,
      minat: minatRes.rows,
      tier: tierRes.rows.map((r) => ({
        tier: r.tier,
        count: Number(r.count),
        total_donasi: Number(r.total_donasi || 0),
      })),
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

