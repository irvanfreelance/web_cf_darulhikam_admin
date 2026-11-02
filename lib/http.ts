import { NextResponse } from 'next/server';
import { z } from 'zod';

const MIGRATION_FILE = 'markdown_darul_hikam/24 sampai 27';

export function zodErrorResponse(error: z.ZodError) {
  return NextResponse.json({ errors: error.issues }, { status: 400 });
}

export function dbErrorResponse(error: { code?: string; message?: string }) {
  const code = error?.code;
  if (code === '42703' || code === '42P01') {
    return NextResponse.json(
      {
        error: `Skema database belum memuat objek yang dibutuhkan. Terapkan ${MIGRATION_FILE} lalu muat ulang.`,
        code,
      },
      { status: 503 }
    );
  }
  if (code === '23505') {
    return NextResponse.json(
      { error: 'Data bentrok dengan yang sudah ada (kode, NIK, atau nilai unik lain).' },
      { status: 409 }
    );
  }
  if (code === '23503') {
    return NextResponse.json(
      { error: 'Referensi tidak ditemukan (kampanye, tim CRM, atau donatur).' },
      { status: 400 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: error?.message || 'Terjadi kesalahan server' }, { status: 500 });
}

export function parseQuery<T extends z.ZodType>(req: Request, schema: T) {
  const { searchParams } = new URL(req.url);
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false as const, response: zodErrorResponse(result.error) };
  }
  return { ok: true as const, data: result.data as z.output<T> };
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 }),
    };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { ok: false as const, response: zodErrorResponse(result.error) };
  }
  return { ok: true as const, data: result.data as z.output<T> };
}
