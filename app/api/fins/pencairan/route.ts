import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Pencairan status filter uses UI-friendly labels but maps to the shared
// fins_ca_pengajuan.approve code (see markdown_darul_hikam/19_fins_pencairan_ca.sql):
//   unapprove -> 'as' (submission approved, belum dicairkan)
//   approved  -> 'a'  (sudah dicairkan)
//   rejected  -> 'r'  (pencairan ditolak)
const STATUS_MAP: Record<string, string> = { unapprove: 'as', approved: 'a', rejected: 'r' };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo = searchParams.get('periodeTo') || '';
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || 'all';
  const officeId = searchParams.get('officeId') || 'all';

  const conditions: string[] = [`p.approve IN ('as','a','r')`];
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
    conditions.push(`(LOWER(p.id_buku) LIKE $${idx} OR LOWER(p.nama_akun) LIKE $${idx} OR LOWER(p.keterangan) LIKE $${idx})`);
  }
  if (status !== 'all' && STATUS_MAP[status]) {
    params.push(STATUS_MAP[status]);
    conditions.push(`p.approve = $${params.length}`);
  }
  if (officeId !== 'all') {
    params.push(Number(officeId));
    conditions.push(`p.office_id = $${params.length}`);
  }

  const sql = `
    SELECT p.id, p.id_buku, p.tanggal, p.coa_debet, p.coa_kredit, p.nama_akun, p.keterangan,
           p.quantity, p.nominal, p.realisasi, p.user_input, p.user_approve, p.approve,
           p.office_id, k.nama AS office_nama, p.sumber_dana, p.department_id,
           p.no_resi, p.via_bayar, p.bank_rek_id, p.tag, p.referensi_mitra, p.pencair, p.tanggal_cair
    FROM fins_ca_pengajuan p
    LEFT JOIN fins_kantor k ON k.id = p.office_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.tanggal DESC, p.id DESC
  `;
  const res = await query(sql, params);
  return NextResponse.json(res.rows);
}
