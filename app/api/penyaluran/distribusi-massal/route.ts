import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { dbErrorResponse, parseBody } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';

const massDisburseSchema = z.object({
  campaign_id: z.coerce.number().int().positive('Program/kampanye wajib dipilih'),
  judul: z.string().trim().min(3, 'Judul minimal 3 karakter').max(300),
  deskripsi: z.string().trim().max(4000).optional().nullable(),
  jenis_penyaluran: z.enum(['transfer', 'tunai', 'barang', 'jasa', 'campuran']),
  nominal_per_pm: z.coerce.number().int().positive('Nominal per penerima harus lebih dari 0'),
  coa_debet: z.string().trim().min(1, 'COA debet wajib').max(14),
  coa_kredit: z.string().trim().min(1, 'COA kredit wajib').max(14),
  beneficiary_ids: z.array(z.coerce.number().int().positive()).min(1, 'Pilih minimal 1 penerima').max(500, 'Maksimal 500 penerima per distribusi'),
  lokasi: z.string().trim().max(200).optional().nullable(),
});

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, massDisburseSchema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const actor = actorCode(session.user?.name);

  try {
    const result = await withTransaction(async (client) => {
      // 1. Verifikasi semua PM ada dan status verified & deleted_at IS NULL
      const pmRes = await client.query(
        `SELECT id, nama_lengkap, kabupaten FROM beneficiaries
         WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL AND status_verifikasi = 'verified'`,
        [data.beneficiary_ids]
      );

      if (pmRes.rowCount !== data.beneficiary_ids.length) {
        throw new Error('Sebagian penerima manfaat tidak valid, belum terverifikasi, atau telah dihapus');
      }

      const totalDiajukan = data.nominal_per_pm * data.beneficiary_ids.length;
      const nomor = await nextNomor(client);

      // 2. Insert 1 baris disbursement_requests
      const reqRes = await client.query(
        `INSERT INTO disbursement_requests (
           nomor_pengajuan, campaign_id, judul, deskripsi, jenis_penyaluran,
           jumlah_diajukan, coa_debet, coa_kredit, status, nik_pengaju
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
         RETURNING id, nomor_pengajuan`,
        [
          nomor,
          data.campaign_id,
          data.judul,
          data.deskripsi || null,
          data.jenis_penyaluran,
          totalDiajukan,
          data.coa_debet,
          data.coa_kredit,
          actor,
        ]
      );

      const requestId = Number(reqRes.rows[0].id);

      // 3. Insert N baris ke disbursement_recipients
      for (const pm of pmRes.rows) {
        await client.query(
          `INSERT INTO disbursement_recipients (
             disbursement_request_id, beneficiary_id, nama_penerima, jumlah_diterima,
             lokasi_penyaluran, satuan
           ) VALUES ($1, $2, $3, $4, $5, 'rupiah')`,
          [
            requestId,
            pm.id,
            pm.nama_lengkap,
            data.nominal_per_pm,
            data.lokasi || pm.kabupaten || null,
          ]
        );
      }

      return {
        id: requestId,
        nomor_pengajuan: reqRes.rows[0].nomor_pengajuan,
        total_penerima: pmRes.rowCount,
        total_diajukan: totalDiajukan,
      };
    });

    await invalidateCache(['api:penyaluran:requests', 'api:penyaluran:dashboard']);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return dbErrorResponse(error);
  }
}

