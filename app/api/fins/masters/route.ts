import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const [offices, jabatan, sumberDana, jenisTransaksi, levelApprove, bankRek, banks, coaAccounts] = await Promise.all([
    query(`SELECT id, nama FROM fins_kantor ORDER BY id`),
    query(`SELECT id, nama FROM fins_jabatan ORDER BY id`),
    query(`SELECT id, nama, active FROM fins_sumber_dana WHERE active = true ORDER BY id`),
    query(`SELECT coa, nama FROM fins_jenis_transaksi_ca ORDER BY coa`),
    query(`SELECT id, jabatan, expend_min, expend_max, receipt_min, receipt_max FROM fins_level_approve WHERE aktif = true ORDER BY expend_min`),
    query(`
      SELECT r.id_rekening, r.keterangan, r.coa, b.id_bank, b.bank
      FROM fins_bank_rek r
      JOIN fins_bank b ON b.id_bank = r.id_bank
      WHERE r.active = 'y'
      ORDER BY b.bank
    `),
    query(`SELECT id_bank, bank FROM fins_bank ORDER BY bank`),
    query(`SELECT coa, nama_coa FROM fins_coa WHERE active = 'y' AND parent = 'n' ORDER BY coa`),
  ]);

  return NextResponse.json({
    offices: offices.rows,
    jabatan: jabatan.rows,
    sumberDana: sumberDana.rows,
    jenisTransaksi: jenisTransaksi.rows,
    levelApprove: levelApprove.rows,
    bankRek: bankRek.rows,
    banks: banks.rows,
    coaAccounts: coaAccounts.rows,
  });
}
