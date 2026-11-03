import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { caPengajuanSchema } from '@/lib/fins/schemas/ca';
import { z } from 'zod';

// Generates an id_buku in the "CA00<yy><mm><dd><seq>0001" scheme
async function generateIdBuku(client: any) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `CA00${yy}${mm}${dd}`;
  const res = await client.query(
    `SELECT id_buku FROM fins_ca_pengajuan WHERE id_buku LIKE $1 ORDER BY id_buku DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (res.rows.length > 0) {
    const last = res.rows[0].id_buku as string;
    const lastSeq = parseInt(last.slice(prefix.length, prefix.length + 3), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}0001`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodeFrom = searchParams.get('periodeFrom') || '';
  const periodeTo = searchParams.get('periodeTo') || '';
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || 'all';
  const officeId = searchParams.get('officeId') || 'all';

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
    conditions.push(`(LOWER(p.id_buku) LIKE $${idx} OR LOWER(p.nama_akun) LIKE $${idx} OR LOWER(p.keterangan) LIKE $${idx})`);
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

  const sql = `
    SELECT p.id, p.id_buku, p.tanggal, p.coa_debet, p.coa_kredit, p.nama_akun, p.keterangan,
           p.quantity, p.nominal, p.realisasi, p.user_input, p.user_approve, p.approve,
           p.office_id, k.nama AS office_nama, p.sumber_dana, p.department_id,
           p.via_bayar, p.bank_rek_id
    FROM fins_ca_pengajuan p
    LEFT JOIN fins_kantor k ON k.id = p.office_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.tanggal DESC, p.id DESC
  `;
  const res = await query(sql, params);
  return NextResponse.json(res.rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'Unknown';

  try {
    const rawBody = await req.json();
    const validated = caPengajuanSchema.parse(rawBody);
    const { header, lines } = validated;

    const idBuku = await withTransaction(async (client) => {
      const generated = await generateIdBuku(client);
      for (const line of lines) {
        await client.query(
          `INSERT INTO fins_ca_pengajuan
            (id_buku, tanggal, coa_debet, coa_kredit, nama_akun, keterangan, quantity, nominal, realisasi,
             user_input, user_approve, approve, office_id, sumber_dana, department_id, via_bayar, bank_rek_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, '', 'us', $10, $11, $12, $13, $14)`,
          [
            generated,
            header.tanggal.slice(0, 10),
            line.coa,
            header.bankAccount || '',
            line.namaAkun,
            line.keterangan || '',
            line.quantity || 1,
            line.nominal,
            userName,
            header.officeId,
            header.sumberDana,
            header.departmentId || null,
            header.viaBayar || '',
            header.bankRekId || null,
          ]
        );
      }
      return generated;
    });

    try {
      await invalidateCache(['fins:ca:list', 'fins:pencairan:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in pengajuan-ca:', e);
    }

    return NextResponse.json({ idBuku }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
