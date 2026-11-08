import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/http';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Profil Kategori Penerima Manfaat (individu vs lembaga)
    const kategoriRes = await query(`
      SELECT 
        kategori,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE deleted_at IS NULL
      GROUP BY kategori
    `);

    // 2. Status Ekonomi Penerima Manfaat
    const ekonomiRes = await query(`
      SELECT 
        COALESCE(NULLIF(TRIM(status_ekonomi), ''), 'Belum Terdata') AS status,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE deleted_at IS NULL
      GROUP BY 1
      ORDER BY count DESC
    `);

    // 3. Distribusi Status Verifikasi PM
    const verifRes = await query(`
      SELECT 
        status_verifikasi,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE deleted_at IS NULL
      GROUP BY status_verifikasi
    `);

    // 4. Sebaran Asnaf PM
    const asnafRes = await query(`
      SELECT 
        COALESCE(NULLIF(TRIM(asnaf), ''), 'Lainnya / Non-Asnaf') AS asnaf,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE deleted_at IS NULL
      GROUP BY 1
      ORDER BY count DESC
    `);

    return NextResponse.json({
      kategori: kategoriRes.rows,
      ekonomi: ekonomiRes.rows,
      verifikasi: verifRes.rows,
      asnaf: asnafRes.rows,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

