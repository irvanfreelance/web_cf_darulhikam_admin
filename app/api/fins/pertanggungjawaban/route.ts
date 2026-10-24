import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';

// ─── ID Generator ────────────────────────────────────────────────────────────
async function generateIdBuku(client: any) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `PTJ${yy}${mm}${dd}`;
  const res = await client.query(
    `SELECT id_buku FROM fins_pertanggungjawaban WHERE id_buku LIKE $1 ORDER BY id_buku DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (res.rows.length > 0) {
    const last = res.rows[0].id_buku as string;
    const lastSeq = parseInt(last.slice(prefix.length, prefix.length + 4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periodeFrom      = searchParams.get('periodeFrom') || '';
  const periodeTo        = searchParams.get('periodeTo') || '';
  const keyword          = searchParams.get('keyword') || '';
  const status           = searchParams.get('status') || 'all';
  const officeId         = searchParams.get('officeId') || 'all';
  const namaAkun         = searchParams.get('namaAkun') || '';
  const coaDebet         = searchParams.get('coaDebet') || '';
  const limit            = parseInt(searchParams.get('limit') || '10', 10);
  const offset           = parseInt(searchParams.get('offset') || '0', 10);

  const conditions: string[] = ['1=1'];
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
      `(LOWER(p.id_buku) LIKE $${idx} OR LOWER(p.nama_akun) LIKE $${idx} OR LOWER(p.keterangan) LIKE $${idx} OR LOWER(p.no_resi) LIKE $${idx})`
    );
  }
  if (status === 'as') {
    conditions.push(`p.approve IN ('as','a')`);
  } else if (status !== 'all') {
    params.push(status);
    conditions.push(`p.approve = $${params.length}`);
  }
  if (officeId !== 'all') {
    params.push(Number(officeId));
    conditions.push(`p.office_id = $${params.length}`);
  }
  if (namaAkun) {
    params.push(`%${namaAkun.toLowerCase()}%`);
    conditions.push(`LOWER(p.nama_akun) LIKE $${params.length}`);
  }
  if (coaDebet) {
    params.push(`%${coaDebet}%`);
    conditions.push(`p.coa_debet LIKE $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const [dataRes, countRes, totalRes] = await Promise.all([
    query(
      `SELECT p.id, p.id_buku, p.tanggal, p.nama_akun, p.keterangan,
              p.quantity, p.nominal, p.user_input, p.approve,
              p.coa_debet, p.coa_kredit, p.nama_akun_kredit, p.no_resi, p.referensi,
              p.office_id, k.nama AS office_nama,
              created_at
       FROM fins_pertanggungjawaban p
       LEFT JOIN fins_kantor k ON k.id = p.office_id
       WHERE ${whereClause}
       ORDER BY p.tanggal DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM fins_pertanggungjawaban p WHERE ${whereClause}`,
      params
    ),
    query(
      `SELECT COALESCE(SUM(p.quantity * p.nominal), 0) AS grand_total
       FROM fins_pertanggungjawaban p WHERE ${whereClause}`,
      params
    ),
  ]);

  return NextResponse.json({
    rows: dataRes.rows,
    total: Number(countRes.rows[0]?.total || 0),
    grandTotal: Number(totalRes.rows[0]?.grand_total || 0),
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session  = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';
  const body     = await req.json();

  const {
    tanggal, nama_akun, keterangan, quantity, nominal,
    office_id, coa_debet, coa_kredit, nama_akun_kredit, no_resi, referensi,
  } = body;

  if (!tanggal || !nominal || !office_id) {
    return NextResponse.json({ error: 'Tanggal, nominal, dan kantor wajib diisi' }, { status: 400 });
  }

  const idBuku = await withTransaction(async (client) => {
    const generated = await generateIdBuku(client);
    await client.query(
      `INSERT INTO fins_pertanggungjawaban
         (id_buku, tanggal, nama_akun, keterangan, quantity, nominal, user_input,
          office_id, coa_debet, coa_kredit, nama_akun_kredit, no_resi, referensi, approve)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'us')`,
      [
        generated,
        tanggal,
        nama_akun || '',
        keterangan || '',
        quantity || 1,
        nominal,
        userName,
        office_id,
        coa_debet || '',
        coa_kredit || '',
        nama_akun_kredit || '',
        no_resi || '',
        referensi || '',
      ]
    );
    return generated;
  });

  return NextResponse.json({ idBuku }, { status: 201 });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session  = await getServerSession(authOptions);
  const userName = session?.user?.name || 'Unknown';
  const body     = await req.json();
  const { ids, action, id, ...fields } = body;

  // Bulk approve/reject
  if (ids && action) {
    const newStatus = action === 'approve' ? 'as' : action === 'reject' ? 'rs' : 'us';
    const placeholders = ids.map((_: any, i: number) => `$${i + 2}`).join(',');
    await query(
      `UPDATE fins_pertanggungjawaban SET approve = $1, user_approve = $${ids.length + 2}, updated_at = NOW()
       WHERE id IN (${placeholders})`,
      [newStatus, ...ids, userName]
    );
    return NextResponse.json({ updated: ids.length });
  }

  // Single approve/reject
  if (id && action) {
    const newStatus = action === 'approve' ? 'as' : action === 'reject' ? 'rs' : 'us';
    await query(
      `UPDATE fins_pertanggungjawaban SET approve = $1, user_approve = $2, updated_at = NOW() WHERE id = $3`,
      [newStatus, userName, id]
    );
    return NextResponse.json({ ok: true });
  }

  // Edit record
  if (id && fields) {
    const { tanggal, nama_akun, keterangan, quantity, nominal, office_id, coa_debet, coa_kredit, nama_akun_kredit, no_resi, referensi } = fields;
    await query(
      `UPDATE fins_pertanggungjawaban
       SET tanggal=$1, nama_akun=$2, keterangan=$3, quantity=$4, nominal=$5,
           office_id=$6, coa_debet=$7, coa_kredit=$8, nama_akun_kredit=$9,
           no_resi=$10, referensi=$11, updated_at=NOW()
       WHERE id=$12`,
      [tanggal, nama_akun, keterangan, quantity, nominal, office_id, coa_debet, coa_kredit, nama_akun_kredit, no_resi || '', referensi || '', id]
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await query(`DELETE FROM fins_pertanggungjawaban WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ ok: true });
}
