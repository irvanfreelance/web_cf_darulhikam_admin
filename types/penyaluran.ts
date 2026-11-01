export const BENEFICIARY_KATEGORI = ['individu', 'keluarga', 'komunitas', 'lembaga'] as const;
export type BeneficiaryKategori = (typeof BENEFICIARY_KATEGORI)[number];

export const BENEFICIARY_EKONOMI = ['sangat_miskin', 'miskin', 'hampir_miskin', 'lainnya'] as const;
export type BeneficiaryEkonomi = (typeof BENEFICIARY_EKONOMI)[number];

export const BENEFICIARY_VERIFIKASI = ['unverified', 'verified', 'rejected'] as const;
export type BeneficiaryVerifikasi = (typeof BENEFICIARY_VERIFIKASI)[number];

export const BENEFICIARY_ASNAF = [
  'fakir',
  'miskin',
  'amil',
  'muallaf',
  'riqab',
  'gharimin',
  'fisabilillah',
  'ibnu_sabil',
] as const;
export type BeneficiaryAsnaf = (typeof BENEFICIARY_ASNAF)[number];

export const BENEFICIARY_KEPUTUSAN = ['pending', 'layak', 'tidak_layak'] as const;
export type BeneficiaryKeputusan = (typeof BENEFICIARY_KEPUTUSAN)[number];

export interface Beneficiary {
  id: number;
  kode_beneficiary: string;
  nama_lengkap: string;
  nik: string | null;
  nomor_kk: string | null;
  tempat_lahir: string | null;
  tgl_lahir: string | null;
  jenis_kelamin: 'L' | 'P' | null;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  kontak: string | null;
  handphone: string | null;
  email: string | null;
  kategori: BeneficiaryKategori;
  status_ekonomi: BeneficiaryEkonomi | null;
  jumlah_anggota_keluarga: number | null;
  asnaf: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  foto_ktp_url: string | null;
  foto_kk_url: string | null;
  foto_rumah_url: string | null;
  status_verifikasi: BeneficiaryVerifikasi;
  verified_by: string | null;
  verified_at: string | null;
  catatan_verifikasi: string | null;
  verifikasi_tempat_tinggal: string | null;
  verifikasi_penghasilan: string | number | null;
  verifikasi_tanggungan: number | null;
  verifikasi_aset: string | null;
  verifikasi_dokumen: string | null;
  verifikasi_keputusan: string | null;
  campaign_id: number | null;
  created_at: string;
  updated_at: string;
}
