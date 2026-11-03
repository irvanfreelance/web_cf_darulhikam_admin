import { z } from 'zod';

export const caHeaderSchema = z.object({
  officeId: z.coerce.number().int().positive('Pilih kantor yang valid'),
  sumberDana: z.string().trim().min(1, 'Sumber dana wajib dipilih'),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD'),
  viaBayar: z.enum(['bank', 'cash', ''], { error: 'Via bayar harus bank atau cash' }),
  bankAccount: z.string().trim().optional().default(''),
  bankRekId: z.coerce.number().int().positive().nullable().optional(),
});

export const caLineSchema = z.object({
  coa: z.string().trim().min(1, 'COA wajib diisi'),
  namaAkun: z.string().trim().min(1, 'Nama akun wajib diisi'),
  quantity: z.coerce.number().int().min(1, 'Quantity minimal 1').default(1),
  nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
  keterangan: z.string().trim().max(1000, 'Keterangan maksimal 1000 karakter').optional().default(''),
});

export const caPengajuanSchema = z.object({
  header: caHeaderSchema,
  lines: z.array(caLineSchema).min(1, 'Detail pengajuan minimal 1 baris'),
});

export const pencairanPatchSchema = z.object({
  action: z.enum(['save', 'reject']),
  noResi: z.string().trim().max(16).optional().default(''),
  viaBayar: z.enum(['bank', 'cash', '']).optional().default(''),
  bankRekId: z.coerce.number().int().positive().nullable().optional(),
  tag: z.enum(['internal', 'external', '']).optional().default(''),
  referensiMitra: z.string().trim().max(200).optional().default(''),
  pencair: z.string().trim().max(100).optional().default(''),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD').optional(),
  cairkan: z.boolean().optional().default(true),
});

