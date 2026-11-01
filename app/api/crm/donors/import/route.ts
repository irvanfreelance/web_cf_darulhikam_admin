import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { z } from 'zod';
import { donorImportBodySchema, donorImportRowSchema, type DonorImportRow } from '@/lib/crm/donor-schema';

type Rejected = { rowIndex: number; reason: string };

function issueText(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.filter((part) => part !== 'rowIndex').map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, donorImportBodySchema);
  if (!parsed.ok) return parsed.response;

  const rejected: Rejected[] = [];
  const valid: DonorImportRow[] = [];
  for (const row of parsed.data.rows) {
    const checked = donorImportRowSchema.safeParse(row);
    if (!checked.success) {
      rejected.push({ rowIndex: Number(row.rowIndex) || 0, reason: issueText(checked.error) });
      continue;
    }
    valid.push(checked.data);
  }

  try {
    const emails = [...new Set(valid.map((row) => row.email?.toLowerCase()).filter((value): value is string => !!value))];
    const phones = [...new Set(valid.map((row) => row.phone).filter((value): value is string => !!value))];
    const niks = [...new Set(valid.map((row) => row.nik).filter((value): value is string => !!value))];

    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const seenNik = new Set<string>();

    if (emails.length || phones.length || niks.length) {
      const existing = await query(
        `SELECT lower(email) AS email, phone, nik
         FROM donors
         WHERE ($1::text[] <> '{}'::text[] AND email IS NOT NULL AND lower(email) = ANY($1::text[]))
            OR ($2::text[] <> '{}'::text[] AND phone IS NOT NULL AND phone = ANY($2::text[]))
            OR ($3::text[] <> '{}'::text[] AND nik IS NOT NULL AND nik = ANY($3::text[]))`,
        [emails, phones, niks]
      );
      for (const row of existing.rows) {
        if (row.email) seenEmail.add(row.email);
        if (row.phone) seenPhone.add(row.phone);
        if (row.nik) seenNik.add(row.nik);
      }
    }

    const teamIds = [...new Set(valid.map((row) => row.tim_crm_id).filter((value): value is number => value != null))];
    const kantorIds = [...new Set(valid.map((row) => row.kantor_id).filter((value): value is number => value != null))];
    const knownTeams = new Set<number>();
    const knownKantor = new Set<number>();
    let kantorTable = true;

    if (teamIds.length) {
      const teams = await query('SELECT id FROM crm_teams WHERE id = ANY($1::bigint[])', [teamIds]);
      teams.rows.forEach((row) => knownTeams.add(Number(row.id)));
    }
    if (kantorIds.length) {
      try {
        const offices = await query('SELECT id FROM fins_kantor WHERE id = ANY($1::int[])', [kantorIds]);
        offices.rows.forEach((row) => knownKantor.add(Number(row.id)));
      } catch (error: any) {
        if (error?.code === '42P01') kantorTable = false;
        else throw error;
      }
    }

    const ready: DonorImportRow[] = [];
    for (const row of valid) {
      const emailKey = row.email?.toLowerCase() || '';
      if (emailKey && seenEmail.has(emailKey)) {
        rejected.push({ rowIndex: row.rowIndex, reason: 'Email sudah terdaftar. Impor hanya menambah data baru.' });
        continue;
      }
      if (row.phone && seenPhone.has(row.phone)) {
        rejected.push({ rowIndex: row.rowIndex, reason: 'Telepon sudah terdaftar. Impor hanya menambah data baru.' });
        continue;
      }
      if (row.nik && seenNik.has(row.nik)) {
        rejected.push({ rowIndex: row.rowIndex, reason: 'NIK sudah terdaftar. Impor hanya menambah data baru.' });
        continue;
      }
      if (row.tim_crm_id && !knownTeams.has(row.tim_crm_id)) {
        rejected.push({ rowIndex: row.rowIndex, reason: 'Tim CRM tidak ditemukan' });
        continue;
      }
      if (kantorTable && row.kantor_id && !knownKantor.has(row.kantor_id)) {
        rejected.push({ rowIndex: row.rowIndex, reason: 'Kantor tidak ditemukan' });
        continue;
      }
      if (emailKey) seenEmail.add(emailKey);
      if (row.phone) seenPhone.add(row.phone);
      if (row.nik) seenNik.add(row.nik);
      ready.push(row);
    }

    let inserted = 0;
    if (ready.length) {
      inserted = await withTransaction(async (client) => {
        let count = 0;
        for (const row of ready) {
          await client.query('SAVEPOINT donor_import_row');
          try {
            await client.query(
              `INSERT INTO donors (
                 name, email, phone, jenis, jenis_kelamin, alamat, nik, status_aktif,
                 kantor_id, tim_crm_id, minat_program
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                row.name,
                row.email,
                row.phone,
                row.jenis,
                row.jenis_kelamin,
                row.alamat,
                row.nik,
                row.status_aktif,
                row.kantor_id,
                row.tim_crm_id,
                row.minat_program,
              ]
            );
            await client.query('RELEASE SAVEPOINT donor_import_row');
            count += 1;
          } catch (error: any) {
            await client.query('ROLLBACK TO SAVEPOINT donor_import_row');
            rejected.push({
              rowIndex: row.rowIndex,
              reason: error?.code === '23505' ? 'Nilai unik sudah dipakai' : (error?.message || 'Gagal menyimpan baris'),
            });
          }
        }
        return count;
      });
      if (inserted > 0) await invalidateCache(['api:crm:donors', 'api:donors', 'donors']);
    }

    rejected.sort((a, b) => a.rowIndex - b.rowIndex);
    return NextResponse.json({
      inserted,
      rejected,
      totalRows: parsed.data.rows.length,
    });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}
