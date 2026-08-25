import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const [offices, jabatan, sumberDana, jenisTransaksi, levelApprove] = await Promise.all([
    query(`SELECT id, nama FROM fins_kantor ORDER BY id`),
    query(`SELECT id, nama FROM fins_jabatan ORDER BY id`),
    query(`SELECT id, nama, active FROM fins_sumber_dana WHERE active = true ORDER BY id`),
    query(`SELECT coa, nama FROM fins_jenis_transaksi_ca ORDER BY coa`),
    query(`SELECT id, jabatan, expend_min, expend_max, receipt_min, receipt_max FROM fins_level_approve WHERE aktif = true ORDER BY expend_min`),
  ]);

  return NextResponse.json({
    offices: offices.rows,
    jabatan: jabatan.rows,
    sumberDana: sumberDana.rows,
    jenisTransaksi: jenisTransaksi.rows,
    levelApprove: levelApprove.rows,
  });
}
