import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { getTrialBalance } from '@/lib/fins/trial-balance';
import { evaluateReportRow } from '@/lib/fins/report-formula';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ report: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report } = await params;
  const reportCode = report.toUpperCase(); // LPK, LPO, LAK, LPD, LA, LR

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1), 10);
  const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()), 10);

  // Periode pembanding (bulan lalu atau tahun lalu)
  const prevBulan = bulan === 1 ? 12 : bulan - 1;
  const prevTahun = bulan === 1 ? tahun - 1 : tahun;

  const periodeFrom = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const periodeTo = new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);

  const prevPeriodeFrom = `${prevTahun}-${String(prevBulan).padStart(2, '0')}-01`;
  const prevPeriodeTo = new Date(Date.UTC(prevTahun, prevBulan, 0)).toISOString().slice(0, 10);

  try {
    // 1. Ambil baris template laporan dari fins_report
    const reportRowsRes = await query(
      `SELECT * FROM fins_report
       WHERE report = $1 AND active = 'y'
       ORDER BY sort ASC, id ASC`,
      [reportCode]
    );

    // 2. Ambil Trial Balance periode berjalan dan periode pembanding
    const tbBerjalanData = await getTrialBalance(null, { periodeFrom, periodeTo });
    const tbPembandingData = await getTrialBalance(null, {
      periodeFrom: prevPeriodeFrom,
      periodeTo: prevPeriodeTo,
    });

    const tbBerjalan = tbBerjalanData.rows;
    const tbPembanding = tbPembandingData.rows;

    // 3. Evaluasi tiap baris laporan
    const rows = reportRowsRes.rows.map((row) => {
      const coaPattern = row.coa || '';
      const berjalanEval = evaluateReportRow(coaPattern, tbBerjalan);
      const pembandingEval = evaluateReportRow(coaPattern, tbPembanding);

      // Logika saldo normal: untuk pos Pasiva/Kewajiban/Ekuitas/Pendapatan, netto positif bila kredit > debet
      const isCreditNormal =
        coaPattern.startsWith('2') ||
        coaPattern.startsWith('3') ||
        coaPattern.startsWith('4');

      const nilaiBerjalan = isCreditNormal
        ? berjalanEval.kredit - berjalanEval.debet
        : berjalanEval.debet - berjalanEval.kredit;

      const nilaiPembanding = isCreditNormal
        ? pembandingEval.kredit - pembandingEval.debet
        : pembandingEval.debet - pembandingEval.kredit;

      return {
        id: row.id,
        namaCoa: row.nama_coa,
        level: row.level,
        coa: row.coa,
        kode: row.kode,
        keterangan: row.keterangan,
        sort: row.sort,
        isHeader: !row.coa || row.coa.trim() === '',
        nilaiBerjalan: !row.coa ? null : nilaiBerjalan,
        nilaiPembanding: !row.coa ? null : nilaiPembanding,
      };
    });

    // 4. Khusus LPK: Hitung seimbang Aset vs (Liabilitas + Aset Neto)
    let summary: any = null;
    if (reportCode === 'LPK') {
      let totalAset = 0;
      let totalLiabilitasEkuitas = 0;

      for (const r of tbBerjalan) {
        if (r.coa.startsWith('1')) {
          totalAset += r.akDebet - r.akKredit;
        } else if (r.coa.startsWith('2') || r.coa.startsWith('3')) {
          totalLiabilitasEkuitas += r.akKredit - r.akDebet;
        }
      }

      summary = {
        totalAset,
        totalLiabilitasEkuitas,
        selisih: totalAset - totalLiabilitasEkuitas,
        isSeimbang: Math.abs(totalAset - totalLiabilitasEkuitas) < 1,
      };
    }

    return NextResponse.json({
      report: reportCode,
      periode: { bulan, tahun },
      pembanding: { bulan: prevBulan, tahun: prevTahun },
      rows,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
