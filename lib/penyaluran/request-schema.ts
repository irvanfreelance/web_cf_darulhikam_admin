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
