import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ idBuku: string }> }) {
  const { idBuku } = await params;
  const res = await query(
    `SELECT p.*, k.nama AS office_nama FROM fins_ca_pengajuan p
     LEFT JOIN fins_kantor k ON k.id = p.office_id
     WHERE p.id_buku = $1 ORDER BY p.id`,
    [idBuku]
  );
  return NextResponse.json(res.rows);
}

export async function PUT(req: Request, { params }: { params: Promise<{ idBuku: string }> }) {
  const { idBuku } = await params;
  const body = await req.json();
  const { header, lines } = body as {
    header: { officeId: number; sumberDana: string; departmentId: number | null; tanggal: string; bankAccount: string };
    lines: Array<{ key?: string; coa: string; namaAkun: string; quantity: number; nominal: number; keterangan: string }>;
  };

  if (!lines || lines.length === 0) {
    return NextResponse.json({ error: 'Detail pengajuan minimal 1 baris' }, { status: 400 });
  }

  await withTransaction(async (client) => {
    // Preserve realisasi for lines that already existed (matched by numeric id in `key`).
    const existing = await client.query(
      `SELECT id, realisasi FROM fins_ca_pengajuan WHERE id_buku = $1`,
      [idBuku]
    );
    const realisasiById = new Map<number, number>(existing.rows.map((r: any) => [r.id, Number(r.realisasi)]));

    await client.query(`DELETE FROM fins_ca_pengajuan WHERE id_buku = $1`, [idBuku]);

    for (const line of lines) {
      const keyId = line.key ? Number(line.key) : NaN;
      const realisasi = realisasiById.get(keyId) || 0;
      await client.query(
        `INSERT INTO fins_ca_pengajuan
          (id_buku, tanggal, coa_debet, coa_kredit, nama_akun, keterangan, quantity, nominal, realisasi, user_input, user_approve, status, office_id, sumber_dana, department_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', '', 'unapprove', $10, $11, $12)`,
        [
          idBuku,
          header.tanggal.slice(0, 10),
          line.coa,
          header.bankAccount,
          line.namaAkun,
          line.keterangan || '',
          line.quantity || 1,
          line.nominal,
          realisasi,
          header.officeId,
          header.sumberDana,
          header.departmentId,
        ]
      );
    }
  });

  return NextResponse.json({ idBuku });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ idBuku: string }> }) {
  const { idBuku } = await params;
  await query(`DELETE FROM fins_ca_pengajuan WHERE id_buku = $1`, [idBuku]);
  return NextResponse.json({ ok: true });
}
