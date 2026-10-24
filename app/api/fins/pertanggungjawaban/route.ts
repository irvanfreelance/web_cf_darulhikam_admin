import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';

function generateIdTrans(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const dt = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return dt + rand;
}

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

  const targetIds: number[] = ids && Array.isArray(ids) && ids.length > 0
    ? ids
    : id ? [id] : [];

  if (targetIds.length === 0) {
    return NextResponse.json({ error: 'id atau ids diperlukan' }, { status: 400 });
  }

  await withTransaction(async (client) => {
    const placeholders = targetIds.map((_: any, i: number) => `$${i + 3}`).join(',');
    await client.query(
      `UPDATE fins_ca_pengajuan SET approve = $1, user_approve = $2, updated_at = NOW()
       WHERE id IN (${placeholders}) AND approve IN ('a','aj','asj')`,
      [newStatus, userName, ...targetIds]
    );

    // When approving, create RCA + Beban entries in fins_trans + fins_jurnal
    if (action === 'approve') {
      const caRes = await client.query(
        `SELECT p.*, r.coa AS bank_coa
         FROM fins_ca_pengajuan p
         LEFT JOIN fins_bank_rek r ON r.id_rekening = p.bank_rek_id
         WHERE p.id IN (${placeholders.replace(/\$(\d+)/g, (_, n) => `$${Number(n) - 2}`)})`,
        targetIds
      );

      const tglExre = new Date().toISOString().slice(0, 10);

      for (const ca of caRes.rows) {
        const nominalFull = Number(ca.nominal) * Number(ca.quantity);
        const realisasi   = Number(ca.realisasi) || 0;
        const bankCoa     = ca.bank_coa || ca.coa_kredit || '';
        const uangMukaCoa = ca.coa_debet || '';
        const idViaBayar  = ca.via_bayar === 'bank' ? 1 : 3;

        // Get beban COA from fins_pertanggungjawaban, fallback to coa_debet
        const ptjRes = await client.query(
          `SELECT coa_debet FROM fins_pertanggungjawaban WHERE id_buku = $1 LIMIT 1`,
          [ca.id_buku]
        );
        const bebanCoa = ptjRes.rows[0]?.coa_debet || uangMukaCoa;

        // RCA: Dr Bank / Cr Uang Muka (full nominal)
        const idTransRca = generateIdTrans();
        await client.query(
          `INSERT INTO fins_trans
             (id_trans, id_exre, coa_ca, coa_debet, coa_kredit, nominal, keterangan,
              nik_input, tgl_exre, jenis, id_kantor, id_via_bayar, approve, quantity, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'r',$10,$11,'asj',1,$6)`,
          [
            idTransRca, ca.id_buku, uangMukaCoa, bankCoa, uangMukaCoa,
            nominalFull, `RCA: ${ca.nama_akun}`,
            userName, tglExre, ca.office_id || 1, idViaBayar,
          ]
        );
        await client.query(
          `INSERT INTO fins_jurnal (id_jurnal, id_exre, coa, debet, kredit, keterangan, nik_input, tgl_exre, id_kantor, id_via_bayar, jenis)
           VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,'r'),
                  ($10,$2,$11,0,$4,$5,$6,$7,$8,$9,'r')`,
          [
            idTransRca + '1', ca.id_buku, bankCoa, nominalFull,
            `RCA: ${ca.nama_akun}`, userName, tglExre,
            ca.office_id || 1, idViaBayar,
            idTransRca + '2', uangMukaCoa,
          ]
        );

        // Beban: Dr Beban / Cr Bank (realisasi amount)
        if (realisasi > 0) {
          const idTransBeban = generateIdTrans();
          await client.query(
            `INSERT INTO fins_trans
               (id_trans, id_exre, coa_ca, coa_debet, coa_kredit, nominal, keterangan,
                nik_input, tgl_exre, jenis, id_kantor, id_via_bayar, approve, quantity, total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'e',$10,$11,'asj',1,$6)`,
            [
              idTransBeban, ca.id_buku, uangMukaCoa, bebanCoa, bankCoa,
              realisasi, `Beban: ${ca.keterangan || ca.nama_akun}`,
              userName, tglExre, ca.office_id || 1, idViaBayar,
            ]
          );
          await client.query(
            `INSERT INTO fins_jurnal (id_jurnal, id_exre, coa, debet, kredit, keterangan, nik_input, tgl_exre, id_kantor, id_via_bayar, jenis)
             VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,'e'),
                    ($10,$2,$11,0,$4,$5,$6,$7,$8,$9,'e')`,
            [
              idTransBeban + '1', ca.id_buku, bebanCoa, realisasi,
              `Beban: ${ca.keterangan || ca.nama_akun}`, userName, tglExre,
              ca.office_id || 1, idViaBayar,
              idTransBeban + '2', bankCoa,
            ]
          );
        }
      }
    }
  });

  return ids && Array.isArray(ids) && ids.length > 0
    ? NextResponse.json({ updated: targetIds.length })
    : NextResponse.json({ ok: true });
}
