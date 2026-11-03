import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { calculateDepreciationSchedule } from '@/lib/fins/depreciation';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const createAsetSchema = z.object({
  kodeAset: z.string().trim().min(3).max(30),
  aset: z.string().trim().min(3, 'Nama aset minimal 3 karakter').max(200),
  coa: z.string().trim().min(1, 'Akun aset wajib dipilih'),
  coaDebit: z.string().trim().min(1, 'Akun beban penyusutan wajib dipilih'),
  coaKredit: z.string().trim().min(1, 'Akun akumulasi penyusutan wajib dipilih'),
  deskripsi: z.string().trim().optional().default(''),
  tglAkuisisi: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  biayaAkuisisi: z.coerce.number().positive('Biaya akuisisi harus > 0'),
  idKantor: z.coerce.number().int().positive().default(1),
  metode: z.enum(['Garis Lurus', 'Saldo Menurun', 'Jumlah Angka Tahun']).default('Garis Lurus'),
  masaManfaat: z.coerce.number().int().min(1, 'Masa manfaat minimal 1 bulan').default(48),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query(
      `SELECT a.*, k.nama AS kantor_nama,
              COALESCE((SELECT SUM(nilai_susut) FROM asset_depreciation_schedules WHERE fins_aset_id = a.id AND status = 'posted'), 0)::numeric AS akumulasi_posted
       FROM fins_aset a
       LEFT JOIN fins_kantor k ON k.id = a.id_kantor
       WHERE a.deleted = 'n'
       ORDER BY a.id DESC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = createAsetSchema.parse(rawBody);

    const tglDate = new Date(validated.tglAkuisisi);

    const result = await withTransaction(async (client) => {
      // 1. Cek kode unik
      const existing = await client.query(`SELECT id FROM fins_aset WHERE kode_aset = $1`, [validated.kodeAset]);
      if (existing.rowCount && existing.rowCount > 0) {
        throw new Error(`Kode aset '${validated.kodeAset}' sudah terdaftar.`);
      }

      // 2. Insert fins_aset
      const asetRes = await client.query(
        `INSERT INTO fins_aset (
           kode_aset, aset, coa, deskripsi, tgl_akuisisi, biaya_akuisisi,
           id_kantor, metode, masa_manfaat, coa_debit, coa_kredit,
           deleted, user_update
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'n', $12)
         RETURNING id, kode_aset`,
        [
          validated.kodeAset,
          validated.aset,
          validated.coa,
          validated.deskripsi,
          tglDate,
          validated.biayaAkuisisi,
          validated.idKantor,
          validated.metode,
          validated.masaManfaat,
          validated.coaDebit,
          validated.coaKredit,
          userName.slice(0, 50),
        ]
      );

      const asetId = Number(asetRes.rows[0].id);

      // 3. Generate dan simpan jadwal penyusutan ke asset_depreciation_schedules
      const schedules = calculateDepreciationSchedule(
        validated.biayaAkuisisi,
        validated.masaManfaat,
        validated.metode,
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
            validated.metode,
          ]
        );
      }

      return asetRes.rows[0];
    });

    try {
      await invalidateCache(['fins:aset:*']);
    } catch (e) {
      console.warn('Redis flush error in aset post:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

