import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query(`DELETE FROM fins_ca_pengajuan WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
