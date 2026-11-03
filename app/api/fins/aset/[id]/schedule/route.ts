import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { calculateDepreciationSchedule } from '@/lib/fins/depreciation';
import { invalidateCache } from '@/lib/redis';

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
      `SELECT s.*, p.status AS period_status
       FROM asset_depreciation_schedules s
       LEFT JOIN accounting_periods p ON p.periode_bulan = s.periode_bulan AND p.periode_tahun = s.periode_tahun
       WHERE s.fins_aset_id = $1
       ORDER BY s.urutan_periode ASC`,
      [asetId]
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST untuk generate ulang jadwal bagi aset yang belum memiliki jadwal (misal 5 aset bawaan lama)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const result = await withTransaction(async (client) => {
      const asetRes = await client.query(
        `SELECT * FROM fins_aset WHERE id = $1 AND deleted = 'n'`,
        [asetId]
      );
      if (asetRes.rowCount === 0) {
        throw new Error('Aset tidak ditemukan');
      }
      const aset = asetRes.rows[0];

      // Cek apakah sudah ada yang posted
      const posted = await client.query(
        `SELECT id FROM asset_depreciation_schedules WHERE fins_aset_id = $1 AND status = 'posted' LIMIT 1`,
        [asetId]
      );
      if (posted.rowCount && posted.rowCount > 0) {
        throw new Error('Tidak dapat membuat ulang jadwal karena sebagian sudah terposting.');
      }

      // Hapus jadwal lama yang berstatus scheduled
      await client.query(
        `DELETE FROM asset_depreciation_schedules WHERE fins_aset_id = $1 AND status = 'scheduled'`,
        [asetId]
      );

      const tglDate = aset.tgl_akuisisi ? new Date(aset.tgl_akuisisi) : new Date();
      const schedules = calculateDepreciationSchedule(
        Number(aset.biaya_akuisisi),
        Number(aset.masa_manfaat) || 48,
        aset.metode || 'Garis Lurus',
        tglDate
      );

      for (const item of schedules) {
        await client.query(
          `INSERT INTO asset_depreciation_schedules (
             fins_aset_id, periode_bulan, periode_tahun, urutan_periode,
             nilai_buku_awal, nilai_susut, nilai_buku_akhir, akumulasi_susut,
             metode, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')`,
          [
            asetId,
            item.periodeBulan,
            item.periodeTahun,
            item.urutanPeriode,
            item.nilaiBukuAwal,
            item.nilaiSusut,
            item.nilaiBukuAkhir,
            item.akumulasiSusut,
            aset.metode || 'Garis Lurus',
          ]
        );
      }

      return { totalJadwal: schedules.length };
    });

    try {
      await invalidateCache(['fins:aset:*']);
    } catch (e) {
      console.warn('Redis flush error:', e);
    }

    return NextResponse.json({ success: true, message: `Berhasil membuat ${result.totalJadwal} jadwal penyusutan.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

