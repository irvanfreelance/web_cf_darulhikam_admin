import { z } from 'zod';
import {
  BENEFICIARY_ASNAF,
  BENEFICIARY_EKONOMI,
  BENEFICIARY_KATEGORI,
  BENEFICIARY_KEPUTUSAN,
  BENEFICIARY_VERIFIKASI,
} from '@/types/penyaluran';

function blankToNull(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') return null;
  if (value === undefined) return null;
  return value;
}

const optionalText = (max: number) =>
  z.preprocess((value) => {
    const next = blankToNull(value);
    return typeof next === 'string' ? next.trim() : next;
  }, z.string().max(max).nullable());

const optionalDate = z.preprocess(
  (value) => blankToNull(value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD').nullable()
);

const optionalInt = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().int().min(0).max(max).nullable()
  );

const optionalMoney = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  z.coerce.number().min(0).max(1_000_000_000_000).nullable()
);

const optionalCoord = (min: number, max: number, label: string) =>
  z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().min(min, `${label} di luar jangkauan`).max(max, `${label} di luar jangkauan`).nullable()
  );

const optionalGender = z.preprocess((value) => {
  if (value == null || value === '') return null;
  const text = String(value).trim().toUpperCase();
  return text;
}, z.enum(['L', 'P'], { error: 'Jenis kelamin harus L atau P' }).nullable());

export const beneficiaryWriteSchema = z
  .object({
    kode_beneficiary: optionalText(20),
    nama_lengkap: z.string().trim().min(3, 'Nama minimal 3 karakter').max(200),
    nik: optionalText(16).refine((value) => value == null || /^\d{16}$/.test(value), 'NIK harus 16 digit'),
    nomor_kk: optionalText(16),
    tempat_lahir: optionalText(100),
    tgl_lahir: optionalDate,
    jenis_kelamin: optionalGender,
    alamat: optionalText(4000),
    rt: optionalText(4),
    rw: optionalText(4),
    kelurahan: optionalText(100),
    kecamatan: optionalText(100),
    kabupaten: optionalText(100),
    provinsi: optionalText(100),
    kontak: optionalText(20),
    handphone: optionalText(20),
    email: z.preprocess((value) => {
      const next = blankToNull(value);
      return typeof next === 'string' ? next.trim() : next;
    }, z.string().email('Email tidak valid').max(150).nullable()),
    kategori: z.enum(BENEFICIARY_KATEGORI).optional().default('individu'),
    status_ekonomi: z.preprocess(
      (value) => (value == null || value === '' ? 'miskin' : value),
      z.enum(BENEFICIARY_EKONOMI)
    ),
    jumlah_anggota_keluarga: optionalInt(100),
    asnaf: z.preprocess(
      (value) => (value == null || value === '' ? null : value),
      z.enum(BENEFICIARY_ASNAF).nullable()
    ),
    latitude: optionalCoord(-90, 90, 'Latitude'),
    longitude: optionalCoord(-180, 180, 'Longitude'),
    foto_ktp_url: optionalText(2000),
    foto_kk_url: optionalText(2000),
    foto_rumah_url: optionalText(2000),
    status_verifikasi: z.enum(BENEFICIARY_VERIFIKASI).optional().default('unverified'),
    catatan_verifikasi: optionalText(4000),
    verifikasi_tempat_tinggal: optionalText(4000),
    verifikasi_penghasilan: optionalMoney,
    verifikasi_tanggungan: optionalInt(50),
    verifikasi_aset: optionalText(4000),
    verifikasi_dokumen: optionalText(4000),
    verifikasi_keputusan: z.preprocess(
      (value) => (value == null || value === '' ? null : value),
      z.enum(BENEFICIARY_KEPUTUSAN).nullable()
    ),
    campaign_id: z.preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.number().int().positive().nullable()
    ),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Latitude dan longitude harus diisi bersamaan',
      });
    }
    if (data.kode_beneficiary && !/^[A-Za-z0-9-]+$/.test(data.kode_beneficiary)) {
      ctx.addIssue({
        code: 'custom',
        path: ['kode_beneficiary'],
        message: 'Kode hanya boleh huruf, angka, dan strip',
      });
    }
  });

export const beneficiaryListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(150).optional().default(''),
  status: z.enum(['all', ...BENEFICIARY_VERIFIKASI]).optional().default('all'),
  kategori: z.enum(['all', ...BENEFICIARY_KATEGORI]).optional().default('all'),
});

export type BeneficiaryWrite = z.output<typeof beneficiaryWriteSchema>;

export const BENEFICIARY_WRITE_COLUMNS = [
  'kode_beneficiary',
  'nama_lengkap',
  'nik',
  'nomor_kk',
  'tempat_lahir',
  'tgl_lahir',
  'jenis_kelamin',
  'alamat',
  'rt',
  'rw',
  'kelurahan',
  'kecamatan',
  'kabupaten',
  'provinsi',
  'kontak',
  'handphone',
  'email',
  'kategori',
  'status_ekonomi',
  'jumlah_anggota_keluarga',
  'asnaf',
  'latitude',
  'longitude',
  'foto_ktp_url',
  'foto_kk_url',
  'foto_rumah_url',
  'status_verifikasi',
  'catatan_verifikasi',
  'verifikasi_tempat_tinggal',
  'verifikasi_penghasilan',
  'verifikasi_tanggungan',
  'verifikasi_aset',
  'verifikasi_dokumen',
  'verifikasi_keputusan',
  'campaign_id',
] as const;

export function roundCoord(value: number | null) {
  if (value == null) return null;
  return Math.round(value * 1e7) / 1e7;
}

export function likeTerm(term: string) {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
