import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// ─── GET ──────────────────────────────────────────────────────────────────────
// Menampilkan CA yang sudah dicairkan (approve IN ('a','aj','asj'))
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo   = searchParams.get('periodeTo') || '';
  const keyword     = searchParams.get('keyword') || '';
  const status      = searchParams.get('status') || 'all';
  const officeId    = searchParams.get('officeId') || 'all';
  const limit       = parseInt(searchParams.get('limit') || '10', 10);
  const offset      = parseInt(searchParams.get('offset') || '0', 10);

  const conditions: string[] = [`p.approve IN ('a','aj','asj')`];
  const params: any[] = [];

  if (periodeFrom) {
    params.push(periodeFrom);
    conditions.push(`p.tanggal >= $${params.length}`);
  }
  if (periodeTo) {
    params.push(periodeTo);
    conditions.push(`p.tanggal <= $${params.length}`);
  }
  if (keyword) {
    params.push(`%${keyword.toLowerCase()}%`);
    const idx = params.length;
    conditions.push(
      `(LOWER(p.id_buku) LIKE $${idx} OR LOWER(p.nama_akun) LIKE $${idx} OR LOWER(p.keterangan) LIKE $${idx})`
    );
  }
  if (status !== 'all') {
    params.push(status);
    conditions.push(`p.approve = $${params.length}`);
  }
  if (officeId !== 'all') {
    params.push(Number(officeId));
    conditions.push(`p.office_id = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [dataRes, countRes, totalRes] = await Promise.all([
    query(
      `SELECT p.id, p.id_buku, p.tanggal, p.nama_akun, p.keterangan,
              p.quantity, p.nominal, p.realisasi, p.user_input, p.user_approve,
              p.approve, p.office_id, k.nama AS office_nama,
              p.coa_debet, p.coa_kredit, p.no_resi, p.referensi_mitra, p.tanggal_cair
       FROM fins_ca_pengajuan p
       LEFT JOIN fins_kantor k ON k.id = p.office_id
       WHERE ${where}
       ORDER BY p.tanggal DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM fins_ca_pengajuan p WHERE ${where}`,
      params
    ),
    query(
      `SELECT COALESCE(SUM(p.nominal), 0) AS grand_total FROM fins_ca_pengajuan p WHERE ${where}`,
      params
    ),
  ]);

  return NextResponse.json({
    rows: dataRes.rows,
    total: Number(countRes.rows[0]?.total || 0),
    grandTotal: Number(totalRes.rows[0]?.grand_total || 0),
  });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
// action: 'submit' → aj | 'approve' → asj | 'unapprove' → a
export async function PATCH(req: Request) {
  const session  = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';
  const body     = await req.json();
  const { ids, action, id } = body;

  const newStatus =
    action === 'submit'    ? 'aj'  :
    action === 'approve'   ? 'asj' :
    action === 'unapprove' ? 'a'   : null;

  if (!newStatus) {
    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  }

  if (ids && Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map((_: any, i: number) => `$${i + 3}`).join(',');
    await query(
      `UPDATE fins_ca_pengajuan SET approve = $1, user_approve = $2, updated_at = NOW()
       WHERE id IN (${placeholders}) AND approve IN ('a','aj','asj')`,
      [newStatus, userName, ...ids]
    );
    return NextResponse.json({ updated: ids.length });
  }

  if (id) {
    await query(
      `UPDATE fins_ca_pengajuan SET approve = $1, user_approve = $2, updated_at = NOW()
       WHERE id = $3 AND approve IN ('a','aj','asj')`,
      [newStatus, userName, id]
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'id atau ids diperlukan' }, { status: 400 });
}
