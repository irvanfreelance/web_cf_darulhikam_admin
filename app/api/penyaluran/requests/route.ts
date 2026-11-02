import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody, parseQuery } from '@/lib/http';
import { actorCode, likeTerm, requestListQuerySchema, requestWriteSchema } from '@/lib/penyaluran/request-schema';

const LIST_SQL = `
  r.id, r.nomor_pengajuan, r.judul, r.status, r.jenis_penyaluran, r.jumlah_diajukan,
  r.jumlah_disetujui, r.tgl_pengajuan, r.campaign_id, r.beneficiary_id, r.coa_debet, r.coa_kredit,
  r.nik_pengaju, r.nik_approver, r.catatan_approver, r.deskripsi, r.created_at,
  r.fins_trans_id, r.fins_reversal_trans_id,
  c.title AS campaign_title, b.nama_lengkap AS beneficiary_nama, b.kode_beneficiary,
  ft.id_trans AS jurnal_nomor, rev.id_trans AS jurnal_balik_nomor
`;

async function nextNomor(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: { nomor_pengajuan: string }[] }> }) {
  const year = new Date().getFullYear();
  const prefix = `DSB-${year}-`;
  const res = await client.query(
    `SELECT nomor_pengajuan FROM disbursement_requests WHERE nomor_pengajuan LIKE $1 ORDER BY nomor_pengajuan DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (res.rows[0]) {
    const tail = parseInt(String(res.rows[0].nomor_pengajuan).slice(prefix.length), 10);
    if (!Number.isNaN(tail)) seq = tail + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

export async function GET(req: Request) {
  const parsed = parseQuery(req, requestListQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const where = ['1=1'];
    const params: unknown[] = [];
    if (parsed.data.search) {
      params.push(likeTerm(parsed.data.search));
      const i = params.length;
      where.push(
        `(r.judul ILIKE $${i} ESCAPE '\\' OR r.nomor_pengajuan ILIKE $${i} ESCAPE '\\' OR COALESCE(b.nama_lengkap, '') ILIKE $${i} ESCAPE '\\')`
      );
    }
    if (parsed.data.status !== 'all') {
      params.push(parsed.data.status);
      where.push(`r.status = $${params.length}`);
    }
    const clause = where.join(' AND ');
    const [listRes, countRes] = await Promise.all([
      query(
        `SELECT ${LIST_SQL}
         FROM disbursement_requests r
         LEFT JOIN campaigns c ON c.id = r.campaign_id
         LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
         LEFT JOIN fins_trans ft ON ft.id = r.fins_trans_id
         LEFT JOIN fins_trans rev ON rev.id = r.fins_reversal_trans_id
         WHERE ${clause}
         ORDER BY r.tgl_pengajuan DESC, r.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parsed.data.limit, parsed.data.offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM disbursement_requests r
         LEFT JOIN beneficiaries b ON b.id = r.beneficiary_id
         WHERE ${clause}`,
        params
      ),
    ]);
    return NextResponse.json({ rows: listRes.rows, total: countRes.rows[0]?.total ?? 0 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, requestWriteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const campaign = await query('SELECT id FROM campaigns WHERE id = $1', [parsed.data.campaign_id]);
    if (campaign.rowCount === 0) return NextResponse.json({ error: 'Program/kampanye tidak ditemukan' }, { status: 400 });
    if (parsed.data.beneficiary_id) {
      const beneficiary = await query(
        'SELECT id FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL',
        [parsed.data.beneficiary_id]
      );
      if (beneficiary.rowCount === 0) return NextResponse.json({ error: 'Penerima manfaat tidak ditemukan' }, { status: 400 });
    }

    const actor = actorCode(session.user?.name);
    const status = parsed.data.ajukan ? 'submitted' : 'draft';
    const row = await withTransaction(async (client) => {
      const nomor = await nextNomor(client);
      const inserted = await client.query(
        `INSERT INTO disbursement_requests (
           nomor_pengajuan, campaign_id, beneficiary_id, judul, deskripsi, jenis_penyaluran,
           jumlah_diajukan, coa_debet, coa_kredit, status, nik_pengaju
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, nomor_pengajuan, status`,
        [
          nomor,
          parsed.data.campaign_id,
          parsed.data.beneficiary_id,
          parsed.data.judul,
          parsed.data.deskripsi,
          parsed.data.jenis_penyaluran,
          parsed.data.jumlah_diajukan,
          parsed.data.coa_debet,
          parsed.data.coa_kredit,
          status,
          actor,
        ]
      );
      return inserted.rows[0];
    });

    await invalidateCache(['api:penyaluran:requests']);
    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
