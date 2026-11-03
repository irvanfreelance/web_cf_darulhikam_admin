import { z } from 'zod';
import { formatWibDate } from '@/lib/wib-date';
import { DONOR_GENDER, DONOR_JENIS } from '@/types/crm';

function blankToNull(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') return null;
  if (value === undefined) return null;
  return value;
}

export const optionalEmail = z.preprocess((value) => {
  const next = blankToNull(value);
  return typeof next === 'string' ? next.trim() : next;
}, z.string().email('Email tidak valid').max(150).nullable());

export const optionalPhone = z.preprocess((value) => {
  const next = blankToNull(value);
  return typeof next === 'string' ? next.trim() : next;
}, z.string().max(20, 'Telepon maksimal 20 karakter').nullable());

export const optionalText = (max: number) =>
  z.preprocess((value) => {
    const next = blankToNull(value);
    return typeof next === 'string' ? next.trim() : next;
  }, z.string().max(max).nullable());

export const optionalNik = z.preprocess((value) => {
  const next = blankToNull(value);
  return typeof next === 'string' ? next.trim() : next;
}, z.string().regex(/^\d{16}$/, 'NIK harus 16 digit').nullable());

export const optionalFk = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  z.coerce.number().int().positive().nullable()
);

export const jenisSchema = z.preprocess((value) => {
  if (value == null || value === '') return 'perorangan';
  return String(value).trim().toLowerCase();
}, z.enum(DONOR_JENIS, { error: 'Jenis harus perorangan, perusahaan, atau komunitas' }));

export const genderSchema = z.preprocess((value) => {
  if (value == null || value === '') return null;
  const text = String(value).trim().toLowerCase();
  if (['l', 'laki-laki', 'laki', 'pria', 'male'].includes(text)) return 'L';
  if (['p', 'perempuan', 'wanita', 'female'].includes(text)) return 'P';
  return text.toUpperCase();
}, z.enum(DONOR_GENDER, { error: 'Jenis kelamin harus L atau P' }).nullable());

export const statusAktifSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return true;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'ya', 'y', 'aktif', 'yes'].includes(text)) return true;
  if (['0', 'false', 'tidak', 'nonaktif', 'no', 't'].includes(text)) return false;
  return value;
}, z.boolean({ error: 'Status aktif harus ya atau tidak' }));

const donorFields = {
  name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(150),
  email: optionalEmail,
  phone: optionalPhone,
  jenis: jenisSchema,
  jenis_kelamin: genderSchema,
  alamat: optionalText(4000),
  nik: optionalNik,
  status_aktif: statusAktifSchema,
  kantor_id: optionalFk,
  tim_crm_id: optionalFk,
  minat_program: optionalText(2000),
};

export const donorWriteSchema = z.object({
  ...donorFields,
  terverifikasi: z.boolean().optional().default(false),
});

export const donorImportRowSchema = z.object({
  rowIndex: z.coerce.number().int().positive(),
  ...donorFields,
});

export const donorImportBodySchema = z.object({
  rows: z
    .array(z.object({ rowIndex: z.coerce.number().int().positive() }).passthrough())
    .min(1, 'Tidak ada baris')
    .max(500, 'Maksimal 500 baris per impor'),
});

export const donorListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50000).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(150).optional().default(''),
  jenis: z.enum(['all', ...DONOR_JENIS]).optional().default('all'),
  status: z.enum(['all', 'aktif', 'nonaktif']).optional().default('all'),
  gender: z.enum(['all', ...DONOR_GENDER]).optional().default('all'),
  kantor_id: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  tim_crm_id: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
});

export type DonorWrite = z.output<typeof donorWriteSchema>;
export type DonorImportRow = z.output<typeof donorImportRowSchema>;

export const IMPORT_HEADER_MAP: Record<string, string> = {
  nama: 'name',
  name: 'name',
  'nama donatur': 'name',
  email: 'email',
  telepon: 'phone',
  phone: 'phone',
  'no. hp': 'phone',
  'no hp': 'phone',
  hp: 'phone',
  whatsapp: 'phone',
  jenis: 'jenis',
  'jenis kelamin': 'jenis_kelamin',
  gender: 'jenis_kelamin',
  alamat: 'alamat',
  nik: 'nik',
  'status aktif': 'status_aktif',
  status_aktif: 'status_aktif',
  aktif: 'status_aktif',
  kantor_id: 'kantor_id',
  'kantor id': 'kantor_id',
  tim_crm_id: 'tim_crm_id',
  'tim crm id': 'tim_crm_id',
  'minat program': 'minat_program',
  minat_program: 'minat_program',
};

export function mapSheetRow(raw: Record<string, unknown>, rowIndex: number) {
  const fields: Record<string, unknown> = { rowIndex };
  for (const [header, value] of Object.entries(raw)) {
    const key = IMPORT_HEADER_MAP[header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ')];
    if (!key) continue;
    if (value == null) {
      fields[key] = '';
    } else if (value instanceof Date) {
      fields[key] = formatWibDate(value);
    } else {
      fields[key] = String(value).trim();
    }
  }
  return fields;
}

export function likeTerm(term: string) {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
