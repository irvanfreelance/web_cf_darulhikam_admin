import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await query(
    `SELECT p.*, k.nama AS office_nama,
            r.keterangan AS bank_rek_keterangan, r.coa AS bank_rek_coa, b.bank AS bank_nama
     FROM fins_ca_pengajuan p
     LEFT JOIN fins_kantor k ON k.id = p.office_id
     LEFT JOIN fins_bank_rek r ON r.id_rekening = p.bank_rek_id
     LEFT JOIN fins_bank b ON b.id_bank = r.id_bank
     WHERE p.id = $1`,
    [id]
  );
  if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, noResi, viaBayar, bankRekId, tag, referensiMitra, pencair, tanggal, cairkan } = body as {
    action: 'save' | 'reject';
    noResi?: string; viaBayar?: string; bankRekId?: string | null; tag?: string;
    referensiMitra?: string; pencair?: string; tanggal?: string; cairkan?: boolean;
  };

  if (!['save', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'save') {
    if (viaBayar === 'bank' && !bankRekId) {
      return NextResponse.json({ error: 'Pilih rekening bank terlebih dahulu' }, { status: 400 });
    }
    const res = await query(
      `UPDATE fins_ca_pengajuan
       SET approve = 'a',
           no_resi = $1,
           via_bayar = $2,
           bank_rek_id = $3,
           tag = $4,
           referensi_mitra = $5,
           pencair = $6,
           tanggal_cair = $7,
           realisasi = CASE WHEN $8 THEN nominal * quantity ELSE realisasi END,
           updated_at = NOW()
       WHERE id = $9 AND approve = 'as'
       RETURNING *`,
      [noResi || '', viaBayar || '', bankRekId || null, tag || '', referensiMitra || '', pencair || '', tanggal || null, !!cairkan, id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Data sudah diproses atau tidak ditemukan' }, { status: 409 });
    }
    return NextResponse.json(res.rows[0]);
  }

  const res = await query(
    `UPDATE fins_ca_pengajuan
     SET approve = 'r', pencair = $1, updated_at = NOW()
     WHERE id = $2 AND approve = 'as'
     RETURNING *`,
    [pencair || '', id]
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Data sudah diproses atau tidak ditemukan' }, { status: 409 });
  }
  return NextResponse.json(res.rows[0]);
}
