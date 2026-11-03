import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withTransaction } from '@/lib/db';
import { postTransaksi } from '@/lib/fins/posting';
import { resolvePeriod } from '@/lib/fins/period';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const postSusutSchema = z.object({
  periodeBulan: z.coerce.number().int().min(1).max(12),
  periodeTahun: z.coerce.number().int().min(2000).max(2100),
  finsAsetId: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = postSusutSchema.parse(rawBody);

    const result = await withTransaction(async (client) => {
      // Format tanggal posting: tanggal terakhir di bulan tersebut
      const tglPosting = new Date(Date.UTC(validated.periodeTahun, validated.periodeBulan, 0));

      // 1. Validasi periode akuntansi harus OPEN
      const period = await resolvePeriod(client, tglPosting);

      // 2. Query jadwal yang siap diposting
      let sql = `
        SELECT s.*, a.aset, a.kode_aset, a.coa_debit, a.coa_kredit, a.id_kantor
        FROM asset_depreciation_schedules s
        JOIN fins_aset a ON a.id = s.fins_aset_id
        WHERE s.periode_bulan = $1 AND s.periode_tahun = $2
          AND s.status = 'scheduled'
          AND a.deleted = 'n'
      `;
      const params: any[] = [validated.periodeBulan, validated.periodeTahun];

      if (validated.finsAsetId) {
        sql += ` AND s.fins_aset_id = $3`;
        params.push(validated.finsAsetId);
      }

      const schedulesRes = await client.query(sql, params);
      const items = schedulesRes.rows;

      if (items.length === 0) {
        return { count: 0, message: 'Tidak ada jadwal penyusutan yang perlu diposting untuk periode ini.' };
      }

      let postedCount = 0;
      for (const item of items) {
        const nominal = Number(item.nilai_susut);
        if (nominal <= 0) continue;

        const uraian = `Penyusutan ${item.kode_aset} - ${item.aset} Periode ${validated.periodeBulan}/${validated.periodeTahun}`;

        // 3. Posting Jurnal (Debet: Beban Penyusutan, Kredit: Akumulasi Penyusutan)
        const trans = await postTransaksi(client, {
          tglExre: tglPosting,
          keterangan: uraian,
          nominal,
          coaDebet: item.coa_debit,
          coaKredit: item.coa_kredit,
          jenis: 'e',
          idKantor: item.id_kantor || 1,
          nikInput: userName.slice(0, 20),
          approve: 'a',
        });

        // 4. Catat di period_adjusting_entries (jenis_aje: 'depresiasi')
        if (period.id) {
          await client.query(
            `INSERT INTO period_adjusting_entries (
               period_id, jenis_aje, no_bukti, tgl_entry, keterangan,
               coa_debit, coa_kredit, nominal, status, fins_trans_id, created_by
             )
             VALUES ($1, 'depresiasi', $2, $3, $4, $5, $6, $7, 'posted', $8, $9)`,
            [
              period.id,
              `AJE-DEP-${item.kode_aset}-${validated.periodeTahun}${String(validated.periodeBulan).padStart(2, '0')}`,
              tglPosting,
              uraian,
              item.coa_debit,
              item.coa_kredit,
              nominal,
              trans.finsTransId,
              userName.slice(0, 50),
            ]
          );
        }

        // 5. Update asset_depreciation_schedules
        await client.query(
          `UPDATE asset_depreciation_schedules
           SET status = 'posted', fins_trans_id = $1, period_id = $2, posted_at = NOW(), posted_by = $3
           WHERE id = $4`,
          [trans.finsTransId, period.id, userName.slice(0, 50), item.id]
        );

        // 6. Update susut_terakhir di fins_aset
        await client.query(
          `UPDATE fins_aset
           SET susut_terakhir = $1,
               tgl_susut_lanjutan = $2,
               user_update = $3
           WHERE id = $4`,
          [
            tglPosting,
            new Date(Date.UTC(validated.periodeTahun, validated.periodeBulan, 1)),
            userName.slice(0, 50),
            item.fins_aset_id,
          ]
        );

        postedCount++;
      }

      return {
        count: postedCount,
        message: `Berhasil memposting penyusutan ${postedCount} aset untuk periode ${validated.periodeBulan}/${validated.periodeTahun}.`,
      };
    });

    try {
      await invalidateCache(['fins:aset:*', 'fins:jurnal:*', 'fins:dashboard:*', 'fins:tb:*']);
    } catch (e) {
      console.warn('Redis flush error:', e);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
