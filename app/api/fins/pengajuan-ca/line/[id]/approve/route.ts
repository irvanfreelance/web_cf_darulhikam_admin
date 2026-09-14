import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';

  if (!['approve', 'reject', 'unapprove'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'approve') {
    const row = await query(`SELECT nominal, quantity FROM fins_ca_pengajuan WHERE id = $1`, [id]);
    if (row.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const total = Number(row.rows[0].nominal) * Number(row.rows[0].quantity);

    const level = await query(
      `SELECT expend_min, expend_max FROM fins_level_approve
       WHERE aktif = true AND expend_min <= $1 AND (expend_max IS NULL OR expend_max >= $1)
       ORDER BY expend_min DESC LIMIT 1`,
      [total]
    );
    if (level.rows.length === 0) {
      return NextResponse.json({ error: 'Nominal di luar seluruh rentang Level Approve yang aktif' }, { status: 403 });
    }
  }

  const approveCode = action === 'approve' ? 'as' : action === 'reject' ? 'rs' : 'us';
  const approver = action === 'unapprove' ? '' : userName;

  const res = await query(
    `UPDATE fins_ca_pengajuan SET approve = $1, user_approve = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [approveCode, approver, id]
  );
  if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(res.rows[0]);
}
