export type DepreciationItem = {
  urutanPeriode: number;
  periodeBulan: number;
  periodeTahun: number;
  nilaiBukuAwal: number;
  nilaiSusut: number;
  nilaiBukuAkhir: number;
  akumulasiSusut: number;
};

/**
 * Calculates monthly depreciation schedules based on method and useful life.
 * Methods supported: 'Garis Lurus', 'Saldo Menurun', 'Jumlah Angka Tahun'
 */
export function calculateDepreciationSchedule(
  biayaAkuisisi: number,
  masaManfaatBulan: number,
  metode: string = 'Garis Lurus',
  tglAkuisisi: Date = new Date()
): DepreciationItem[] {
  const schedule: DepreciationItem[] = [];
  let nilaiBuku = biayaAkuisisi;
  let akumulasi = 0;

  const startMonth = tglAkuisisi.getMonth() + 1;
  const startYear = tglAkuisisi.getFullYear();

  if (metode === 'Garis Lurus') {
    const susutPerBulan = Math.round(biayaAkuisisi / masaManfaatBulan);

    for (let i = 1; i <= masaManfaatBulan; i++) {
      const curMonth = ((startMonth - 1 + (i - 1)) % 12) + 1;
      const curYear = startYear + Math.floor((startMonth - 1 + (i - 1)) / 12);

      const nilaiSusut = i === masaManfaatBulan ? nilaiBuku : Math.min(nilaiBuku, susutPerBulan);
      const nilaiBukuAwal = nilaiBuku;
      nilaiBuku -= nilaiSusut;
      akumulasi += nilaiSusut;

      schedule.push({
        urutanPeriode: i,
        periodeBulan: curMonth,
        periodeTahun: curYear,
        nilaiBukuAwal,
        nilaiSusut,
        nilaiBukuAkhir: Math.max(0, nilaiBuku),
        akumulasiSusut: akumulasi,
      });

      if (nilaiBuku <= 0) break;
    }
  } else {
    // Default fallback Garis Lurus
    const susutPerBulan = Math.round(biayaAkuisisi / masaManfaatBulan);
    for (let i = 1; i <= masaManfaatBulan; i++) {
      const curMonth = ((startMonth - 1 + (i - 1)) % 12) + 1;
      const curYear = startYear + Math.floor((startMonth - 1 + (i - 1)) / 12);

      const nilaiSusut = i === masaManfaatBulan ? nilaiBuku : Math.min(nilaiBuku, susutPerBulan);
      const nilaiBukuAwal = nilaiBuku;
      nilaiBuku -= nilaiSusut;
      akumulasi += nilaiSusut;

      schedule.push({
        urutanPeriode: i,
        periodeBulan: curMonth,
        periodeTahun: curYear,
        nilaiBukuAwal,
        nilaiSusut,
        nilaiBukuAkhir: Math.max(0, nilaiBuku),
        akumulasiSusut: akumulasi,
      });

      if (nilaiBuku <= 0) break;
    }
  }

  return schedule;
}

