import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { z } from 'zod';

const dashboardQuerySchema = z.object({
  kantorId: z.string().optional().default('all'),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = dashboardQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { kantorId } = parsed.data;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Filter kantor
    const kantorFilter = kantorId !== 'all' ? Number(kantorId) : null;

    // 1. Ambil seluruh akun kas & bank (fins_bank_rek + fins_kantor_coa)
    const bankAccountsRes = await query(
      `SELECT r.id_rekening, r.keterangan AS label, r.coa, b.bank AS bank_nama, 'bank' AS jenis
       FROM fins_bank_rek r
       LEFT JOIN fins_bank b ON b.id_bank = r.id_bank
       WHERE r.active = 'y'
       ORDER BY r.id_rekening ASC`
    );

    const kantorCoaRes = await query(
      `SELECT kc.id_kantor, k.nama AS kantor_nama, kc.coa_cash, kc.coa_non_cash
       FROM fins_kantor_coa kc
       LEFT JOIN fins_kantor k ON k.id = kc.id_kantor
       ${kantorFilter ? `WHERE kc.id_kantor = $1` : ''}`,
      kantorFilter ? [kantorFilter] : []
    );

    // Kumpulkan daftar COA Kas & Bank unik
    const accountCards: Array<{
      id: string;
      label: string;
      coa: string;
      tipe: 'kas' | 'bank';
      saldo: number;
    }> = [];

    // Tambah Bank
    for (const b of bankAccountsRes.rows) {
      if (b.coa) {
        accountCards.push({
          id: `bank-${b.id_rekening}`,
          label: `${b.bank_nama || 'Bank'} - ${b.label}`,
          coa: b.coa,
          tipe: 'bank',
          saldo: 0,
        });
      }
    }

    // Tambah Kas Kantor
    for (const kc of kantorCoaRes.rows) {
      if (kc.coa_cash) {
        accountCards.push({
          id: `kas-${kc.id_kantor}`,
          label: `Kas ${kc.kantor_nama || 'Pusat'}`,
          coa: kc.coa_cash,
          tipe: 'kas',
          saldo: 0,
        });
      }
    }

    // 2. Hitung saldo untuk setiap COA: Saldo Opname terakhir + Mutasi Jurnal sesudahnya
    for (const acc of accountCards) {
      const opnameRes = await query(
        `SELECT saldo_akhir, tanggal
         FROM fins_opname
         WHERE coa = $1 AND per = 'd'
         ${kantorFilter ? `AND id_kantor = $2` : ''}
         ORDER BY tanggal DESC LIMIT 1`,
        kantorFilter ? [acc.coa, kantorFilter] : [acc.coa]
      );

      let saldoAwal = 0;
      let tglOpname = '1970-01-01';

      if (opnameRes.rowCount && opnameRes.rows[0]) {
        saldoAwal = Number(opnameRes.rows[0].saldo_akhir || 0);
        tglOpname = opnameRes.rows[0].tanggal.toISOString().slice(0, 10);
      }

      // Hitung mutasi jurnal sesudah tanggal opname
      const mutasiRes = await query(
        `SELECT COALESCE(SUM(debet), 0)::numeric AS sum_debet,
                COALESCE(SUM(kredit), 0)::numeric AS sum_kredit
         FROM fins_jurnal
         WHERE coa = $1 AND tgl_exre > $2
         ${kantorFilter ? `AND id_kantor = $3` : ''}`,
        kantorFilter ? [acc.coa, tglOpname, kantorFilter] : [acc.coa, tglOpname]
      );

      const debet = Number(mutasiRes.rows[0]?.sum_debet || 0);
      const kredit = Number(mutasiRes.rows[0]?.sum_kredit || 0);

      // Saldo normal kas/bank = Debet - Kredit
      acc.saldo = saldoAwal + (debet - kredit);
    }

    const totalKas = accountCards
      .filter((a) => a.tipe === 'kas')
      .reduce((sum, a) => sum + a.saldo, 0);

    const totalBank = accountCards
      .filter((a) => a.tipe === 'bank')
      .reduce((sum, a) => sum + a.saldo, 0);

    // 3. Mutasi Hari Ini
    const mutasiHariIniRes = await query(
      `SELECT COALESCE(SUM(debet), 0)::numeric AS masuk,
              COALESCE(SUM(kredit), 0)::numeric AS keluar
       FROM fins_jurnal
       WHERE tgl_exre = $1
       ${kantorFilter ? `AND id_kantor = $2` : ''}`,
      kantorFilter ? [today, kantorFilter] : [today]
    );

    const mutasiMasukHariIni = Number(mutasiHariIniRes.rows[0]?.masuk || 0);
    const mutasiKeluarHariIni = Number(mutasiHariIniRes.rows[0]?.keluar || 0);

    // 4. Status CA Berjalan
    const caStatsRes = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN approve = 'as' THEN nominal * quantity ELSE 0 END), 0)::numeric AS ca_menunggu_cair,
         COUNT(CASE WHEN approve = 'as' THEN 1 END)::int AS count_menunggu_cair,
         COALESCE(SUM(CASE WHEN approve = 'a' AND (nominal_lpj IS NULL OR nominal_lpj = 0) THEN nominal * quantity ELSE 0 END), 0)::numeric AS ca_belum_lpj,
         COUNT(CASE WHEN approve = 'a' AND (nominal_lpj IS NULL OR nominal_lpj = 0) THEN 1 END)::int AS count_belum_lpj
       FROM fins_ca_pengajuan
       WHERE approve IN ('as', 'a')
       ${kantorFilter ? `AND office_id = $1` : ''}`,
      kantorFilter ? [kantorFilter] : []
    );

    const caStats = caStatsRes.rows[0] || {
      ca_menunggu_cair: 0,
      count_menunggu_cair: 0,
      ca_belum_lpj: 0,
      count_belum_lpj: 0,
    };

    // 5. Tren 30 Hari (Jurnal harian)
    const trendRes = await query(
      `SELECT tgl_exre::date AS tanggal,
              COALESCE(SUM(debet), 0)::numeric AS penerimaan,
              COALESCE(SUM(kredit), 0)::numeric AS pengeluaran
       FROM fins_jurnal
       WHERE tgl_exre >= $1
       ${kantorFilter ? `AND id_kantor = $2` : ''}
       GROUP BY tgl_exre::date
       ORDER BY tgl_exre::date ASC`,
      kantorFilter ? [thirtyDaysAgo, kantorFilter] : [thirtyDaysAgo]
    );

    const trend = trendRes.rows.map((t: any) => ({
      tanggal: t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '',
      penerimaan: Number(t.penerimaan || 0),
      pengeluaran: Number(t.pengeluaran || 0),
    }));

    return NextResponse.json({
      summary: {
        totalKas,
        totalBank,
        totalSaldo: totalKas + totalBank,
        mutasiMasukHariIni,
        mutasiKeluarHariIni,
        caMenungguCair: Number(caStats.ca_menunggu_cair || 0),
        countMenungguCair: Number(caStats.count_menunggu_cair || 0),
        caBelumLpj: Number(caStats.ca_belum_lpj || 0),
        countBelumLpj: Number(caStats.count_belum_lpj || 0),
      },
      accounts: accountCards,
      trend,
    });
  } catch (error: any) {
    console.error('API Dashboard Cash Bank Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

