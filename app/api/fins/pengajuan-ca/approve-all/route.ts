import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// Bulk-approves every 'unapprove' row matching the given filter set, skipping
// rows whose nominal falls outside every active fins_level_approve range.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';

  const body = await req.json().catch(() => ({}));
  const { periodeFrom, periodeTo, keyword, officeId } = body as {
    periodeFrom?: string; periodeTo?: string; keyword?: string; officeId?: string;
  };

  const conditions: string[] = [`status = 'unapprove'`];
  const params: any[] = [];

  if (periodeFrom) { params.push(periodeFrom); conditions.push(`tanggal >= $${params.length}`); }
  if (periodeTo) { params.push(periodeTo); conditions.push(`tanggal <= $${params.length}`); }
  if (keyword) {
    params.push(`%${keyword.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(`(LOWER(id_buku) LIKE $${idx} OR LOWER(nama_akun) LIKE $${idx} OR LOWER(keterangan) LIKE $${idx})`);
  }
  if (officeId && officeId !== 'all') { params.push(Number(officeId)); conditions.push(`office_id = $${params.length}`); }

  const targets = await query(
    `SELECT id, nominal, quantity FROM fins_ca_pengajuan WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (targets.rows.length === 0) {
    return NextResponse.json({ approved: 0, skipped: 0 });
  }

  const levels = await query(
    `SELECT expend_min, expend_max FROM fins_level_approve WHERE aktif = true`
  );

  const withinAnyLevel = (total: number) =>
    levels.rows.some((l: any) => total >= Number(l.expend_min) && (l.expend_max === null || total <= Number(l.expend_max)));

  const approveIds: number[] = [];
  let skipped = 0;
  for (const row of targets.rows) {
    const total = Number(row.nominal) * Number(row.quantity);
    if (withinAnyLevel(total)) approveIds.push(row.id);
    else skipped++;
  }

  if (approveIds.length > 0) {
    await query(
      `UPDATE fins_ca_pengajuan SET status = 'approved', user_approve = $1, updated_at = NOW() WHERE id = ANY($2::bigint[])`,
      [userName, approveIds]
    );
  }

  return NextResponse.json({ approved: approveIds.length, skipped });
}
