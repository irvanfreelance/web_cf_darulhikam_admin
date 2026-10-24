import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';

function generateIdTrans(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const dt = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return dt + rand;
}

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

    const result = await withTransaction(async (client) => {
      const updateRes = await client.query(
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

      if (updateRes.rows.length === 0) return null;

      const ca = updateRes.rows[0];
      const nominal = Number(ca.nominal) * Number(ca.quantity);
      const tglExre = ca.tanggal_cair || tanggal || new Date().toISOString().slice(0, 10);
      const idViaBayar = viaBayar === 'bank' ? 1 : 3;

      // Get bank COA from bank_rek_id
      let bankCoa = ca.coa_kredit || '';
      if (bankRekId) {
        const rekRes = await client.query(
          `SELECT coa FROM fins_bank_rek WHERE id_rekening = $1`,
          [bankRekId]
        );
        if (rekRes.rows.length > 0) bankCoa = rekRes.rows[0].coa;
      }

      // Insert fins_trans CA row
      const idTrans = generateIdTrans();
      await client.query(
        `INSERT INTO fins_trans
           (id_trans, id_exre, coa_ca, coa_debet, coa_kredit, nominal, keterangan,
            nik_input, tgl_exre, jenis, id_kantor, id_via_bayar, noresi, approve, quantity, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'e',$10,$11,$12,'a',1,$6)`,
        [
          idTrans, ca.id_buku, ca.coa_debet, ca.coa_debet, bankCoa,
          nominal, `CA: ${ca.nama_akun}`,
          ca.user_input || '', tglExre,
          ca.office_id || 1, idViaBayar, noResi || '',
        ]
      );

      // Insert fins_jurnal debet + kredit
      await client.query(
        `INSERT INTO fins_jurnal (id_jurnal, id_exre, coa, debet, kredit, keterangan, nik_input, tgl_exre, id_kantor, id_via_bayar, jenis, noresi)
         VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,'e',$10),
                ($11,$2,$12,0,$4,$5,$6,$7,$8,$9,'e',$10)`,
        [
          idTrans + '1', ca.id_buku, ca.coa_debet, nominal,
          `CA: ${ca.nama_akun}`, ca.user_input || '', tglExre,
          ca.office_id || 1, idViaBayar, noResi || '',
          idTrans + '2', bankCoa,
        ]
      );

      return ca;
    });

    if (!result) {
      return NextResponse.json({ error: 'Data sudah diproses atau tidak ditemukan' }, { status: 409 });
    }
    return NextResponse.json(result);
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
