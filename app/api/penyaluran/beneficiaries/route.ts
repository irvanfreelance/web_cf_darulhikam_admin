import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody, parseQuery } from '@/lib/http';
import {
  BENEFICIARY_WRITE_COLUMNS,
  beneficiaryListQuerySchema,
  beneficiaryWriteSchema,
  likeTerm,
  roundCoord,
  type BeneficiaryWrite,
} from '@/lib/penyaluran/beneficiary-schema';

const LIST_COLUMNS = `
  b.id, b.kode_beneficiary, b.nama_lengkap, b.nik, b.kategori, b.kabupaten,
  b.provinsi, b.status_verifikasi, b.asnaf, b.latitude, b.longitude, b.handphone, b.created_at
`;

async function nextKode(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: { kode_beneficiary: string }[] }> }) {
  const year = new Date().getFullYear();
  const prefix = `BNF-${year}-`;
  const res = await client.query(
    `SELECT kode_beneficiary FROM beneficiaries WHERE kode_beneficiary LIKE $1 ORDER BY kode_beneficiary DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (res.rows[0]) {
    const tail = parseInt(String(res.rows[0].kode_beneficiary).slice(prefix.length), 10);
    if (!Number.isNaN(tail)) seq = tail + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

function columnValues(data: BeneficiaryWrite, kode: string) {
  return BENEFICIARY_WRITE_COLUMNS.map((column) => {
    if (column === 'kode_beneficiary') return kode;
    if (column === 'latitude') return roundCoord(data.latitude);
    if (column === 'longitude') return roundCoord(data.longitude);
    return data[column];
  });
}

async function assertCampaign(campaignId: number | null) {
  if (!campaignId) return null;
  const res = await query('SELECT id FROM campaigns WHERE id = $1', [campaignId]);
  if (res.rowCount === 0) return 'Kampanye tidak ditemukan';
  return null;
}

export async function GET(req: Request) {
  const parsed = parseQuery(req, beneficiaryListQuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const where = ['b.deleted_at IS NULL'];
    const params: unknown[] = [];
    if (parsed.data.search) {
      params.push(likeTerm(parsed.data.search));
      const i = params.length;
      where.push(
        `(b.nama_lengkap ILIKE $${i} ESCAPE '\\' OR b.nik ILIKE $${i} ESCAPE '\\' OR b.kode_beneficiary ILIKE $${i} ESCAPE '\\' OR COALESCE(b.kabupaten, '') ILIKE $${i} ESCAPE '\\')`
      );
    }
    if (parsed.data.status !== 'all') {
      params.push(parsed.data.status);
      where.push(`b.status_verifikasi = $${params.length}`);
    }
    if (parsed.data.kategori !== 'all') {
      params.push(parsed.data.kategori);
      where.push(`b.kategori = $${params.length}`);
    }
    const clause = where.join(' AND ');
    const listParams = [...params, parsed.data.limit, parsed.data.offset];
    const [listRes, countRes] = await Promise.all([
      query(
        `SELECT ${LIST_COLUMNS}
         FROM beneficiaries b
         WHERE ${clause}
         ORDER BY b.created_at DESC, b.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        listParams
      ),
      query(`SELECT COUNT(*)::int AS total FROM beneficiaries b WHERE ${clause}`, params),
    ]);
    return NextResponse.json({ rows: listRes.rows, total: countRes.rows[0]?.total ?? 0 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, beneficiaryWriteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const problem = await assertCampaign(parsed.data.campaign_id);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const actor = (session.user?.name || 'admin').slice(0, 20);
    const verifying = parsed.data.status_verifikasi === 'verified';
    const row = await withTransaction(async (client) => {
      const kode = parsed.data.kode_beneficiary || (await nextKode(client));
      const values = columnValues(parsed.data, kode);
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const verifiedByIdx = values.length + 1;
      const verifiedAtIdx = values.length + 2;
      const inserted = await client.query(
        `INSERT INTO beneficiaries (${BENEFICIARY_WRITE_COLUMNS.join(', ')}, verified_by, verified_at)
         VALUES (${placeholders.join(', ')}, $${verifiedByIdx}, $${verifiedAtIdx})
         RETURNING *`,
        [...values, verifying ? actor : null, verifying ? new Date() : null]
      );
      return inserted.rows[0];
    });

    await invalidateCache(['api:penyaluran:beneficiaries', 'api:beneficiaries']);
    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
