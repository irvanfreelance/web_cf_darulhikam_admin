import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// GET: list breakdown rows for a given id_buku + CA header info
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idBuku = searchParams.get('idBuku') || '';
  const caId   = searchParams.get('caId') || '';

  if (!idBuku && !caId) {
    return NextResponse.json({ error: 'idBuku atau caId diperlukan' }, { status: 400 });
  }

  const [caRes, detailRes] = await Promise.all([
    caId
      ? query(
          `SELECT p.*, k.nama AS office_nama,
                  r.keterangan AS bank_rek_keterangan, r.coa AS bank_rek_coa, b.bank AS bank_nama
           FROM fins_ca_pengajuan p
           LEFT JOIN fins_kantor k ON k.id = p.office_id
           LEFT JOIN fins_bank_rek r ON r.id_rekening = p.bank_rek_id
           LEFT JOIN fins_bank b ON b.id_bank = r.id_bank
           WHERE p.id = $1`,
          [caId]
        )
      : query(
          `SELECT p.*, k.nama AS office_nama,
                  r.keterangan AS bank_rek_keterangan, r.coa AS bank_rek_coa, b.bank AS bank_nama
           FROM fins_ca_pengajuan p
           LEFT JOIN fins_kantor k ON k.id = p.office_id
           LEFT JOIN fins_bank_rek r ON r.id_rekening = p.bank_rek_id
           LEFT JOIN fins_bank b ON b.id_bank = r.id_bank
           WHERE p.id_buku = $1`,
          [idBuku]
        ),
    query(
      `SELECT * FROM fins_pertanggungjawaban WHERE id_buku = $1 ORDER BY created_at`,
      [idBuku || '']
    ),
  ]);

  return NextResponse.json({
    ca: caRes.rows[0] || null,
    details: detailRes.rows,
  });
}

// POST: add a breakdown row
export async function POST(req: Request) {
  const session  = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';
  const body     = await req.json();
  const { idBuku, tanggal, namaAkun, keterangan, quantity, nominal, officeId, coaDebet, coaKredit, namaAkunKredit, noResi, referensi } = body;

  if (!idBuku || !nominal || !coaDebet) {
    return NextResponse.json({ error: 'idBuku, nominal, dan coaDebet diperlukan' }, { status: 400 });
  }

  const res = await query(
    `INSERT INTO fins_pertanggungjawaban
       (id_buku, tanggal, nama_akun, keterangan, quantity, nominal, user_input, office_id,
        coa_debet, coa_kredit, nama_akun_kredit, no_resi, referensi, approve)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'us')
     RETURNING *`,
    [
      idBuku, tanggal || new Date().toISOString().slice(0, 10),
      namaAkun || '', keterangan || '',
      quantity || 1, nominal, userName, officeId || null,
      coaDebet, coaKredit || '', namaAkunKredit || '',
      noResi || '', referensi || '',
    ]
  );

  return NextResponse.json(res.rows[0], { status: 201 });
}

// DELETE: remove a breakdown row
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id diperlukan' }, { status: 400 });

  await query(`DELETE FROM fins_pertanggungjawaban WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
