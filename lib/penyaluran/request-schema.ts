import { z } from 'zod';

export const JENIS_PENYALURAN = ['transfer', 'tunai', 'barang', 'jasa', 'campuran'] as const;
export const REQUEST_STATUS = ['draft', 'submitted', 'reviewed', 'approved', 'disbursed', 'cancelled', 'rejected'] as const;

function blankToNull(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

const optionalText = (max: number) =>
  z.preprocess((value) => {
    const next = blankToNull(value);
    return typeof next === 'string' ? next.trim() : next;
  }, z.string().max(max).nullable());

export const requestWriteSchema = z.object({
  judul: z.string().trim().min(3, 'Judul minimal 3 karakter').max(300),
  deskripsi: optionalText(4000),
  campaign_id: z.coerce.number().int().positive('Program/kampanye wajib dipilih'),
  beneficiary_id: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().int().positive().nullable()
  ),
  jenis_penyaluran: z.enum(JENIS_PENYALURAN),
  jumlah_diajukan: z.coerce.number().int().positive('Jumlah harus lebih dari 0'),
  coa_debet: z.string().trim().min(1, 'COA debet wajib').max(14),
  coa_kredit: z.string().trim().min(1, 'COA kredit wajib').max(14),
  ajukan: z.boolean().optional().default(true),
});

export const requestDecisionSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'submit']),
    catatan: optionalText(4000),
    jumlah_disetujui: z.preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.number().int().min(0).nullable()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'reject' && !data.catatan) {
      ctx.addIssue({ code: 'custom', path: ['catatan'], message: 'Catatan wajib saat menolak' });
    }
  });

export const requestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(150).optional().default(''),
  status: z.enum(['all', ...REQUEST_STATUS]).optional().default('all'),
});

export const qurbanListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(150).optional().default(''),
});

export function likeTerm(term: string) {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function actorCode(name?: string | null) {
  const raw = (name || 'admin').replace(/\s+/g, ' ').trim();
  return raw.slice(0, 20) || 'admin';
}

export const BUKTI_JENIS = ['foto', 'video', 'tanda_terima', 'berita_acara', 'kwitansi', 'lainnya'] as const;

export const realisasiSchema = z.object({
  jumlah_realisasi: z.coerce.number().int().positive('Jumlah realisasi harus lebih dari 0'),
  tgl_kegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD'),
  narasi: z.string().trim().min(3, 'Narasi LPJ minimal 3 karakter').max(8000),
  judul: optionalText(300),
  penerima: z.array(z.object({
    beneficiary_id: z.preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.number().int().positive().nullable()
    ),
    nama_penerima: z.string().trim().min(1, 'Nama penerima wajib').max(200),
    jumlah_diterima: z.coerce.number().int().positive('Jumlah diterima harus lebih dari 0'),
  })).min(1, 'Minimal satu penerima').max(100),
  bukti: z.array(z.object({
    file_url: z.string().trim().min(1).max(2000),
    jenis_dokumen: z.enum(BUKTI_JENIS).optional().default('lainnya'),
    caption: optionalText(300),
  })).max(10).optional().default([]),
});
