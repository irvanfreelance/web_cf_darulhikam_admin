import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { parseBody } from '@/lib/http';
import { actorCode } from '@/lib/penyaluran/request-schema';
import { JournalError, postBalancedEntry } from '@/lib/fins/post-journal';
import { formatWibDate, todayWib } from '@/lib/wib-date';

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const bodySchema = z.object({ action: z.enum(['post', 'reverse']) });

function fail(error: any) {
  if (error instanceof JournalError || error?.status) {
    return NextResponse.json({ error: error.message }, { status: error.status || 409 });
  }
  if (error?.code === '42703' || error?.code === '42P01') {
    return NextResponse.json({ error: 'Skema jurnal belum lengkap. Terapkan migrasi 27 dan pastikan tabel FINS ada.', code: error.code }, { status: 503 });
  }
  console.error(error);
  return NextResponse.json({ error: error?.message || 'Gagal menjurnal' }, { status: 500 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  const parsed = await parseBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const nik = actorCode(session.user?.name);
    const result = await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT r.id, r.status, r.nomor_pengajuan, r.judul, r.coa_debet, r.coa_kredit,
                r.jumlah_diajukan, r.jumlah_disetujui, r.tgl_pengajuan, r.tgl_realisasi,
                r.fins_trans_id, r.fins_reversal_trans_id, r.campaign_id,
                (SELECT l.jumlah_realisasi FROM disbursement_lpj l
                 WHERE l.request_id = r.id ORDER BY l.id DESC LIMIT 1) AS jumlah_realisasi
         FROM disbursement_requests r
         WHERE r.id = $1
         FOR UPDATE`,
        [parsedId.data.id]
      );
      if (current.rowCount === 0) throw new JournalError('Pengajuan tidak ditemukan', 404);
      const row = current.rows[0];
      if (!['approved', 'disbursed'].includes(row.status)) {
        throw new JournalError('Hanya pengajuan disetujui atau disalurkan yang bisa dijurnal');
      }

      if (parsed.data.action === 'post') {
        if (row.fins_trans_id) {
          return { already: true, fins_trans_id: Number(row.fins_trans_id), id_trans: null };
        }
        const nominal = Number(row.jumlah_realisasi || row.jumlah_disetujui || row.jumlah_diajukan);
        const tanggal = formatWibDate(row.tgl_realisasi || row.tgl_pengajuan || new Date());
        const posted = await postBalancedEntry(client, {
          tanggal,
          nominal,
          coaDebet: row.coa_debet,
          coaKredit: row.coa_kredit,
          keterangan: `Pencairan ${row.nomor_pengajuan} ${row.judul}`,
          idTransaksi: row.nomor_pengajuan,
          idExre: row.nomor_pengajuan,
          noresi: String(row.nomor_pengajuan).replace(/\W/g, '').slice(-16),
          nikInput: nik,
          jenis: 'e',
          mutasi: '3',
          note: `disbursement_request:${row.id}`,
          idProgram: Number(row.campaign_id) || 0,
        });
        await client.query(
          `UPDATE disbursement_requests
           SET fins_trans_id = $1,
               status = CASE WHEN status = 'approved' THEN 'disbursed' ELSE status END,
               tgl_realisasi = COALESCE(tgl_realisasi, $2::timestamptz),
               updated_at = NOW()
           WHERE id = $3 AND fins_trans_id IS NULL`,
          [posted.id, tanggal, row.id]
        );
        return { already: false, fins_trans_id: posted.id, id_trans: posted.idTrans };
      }

      if (!row.fins_trans_id) throw new JournalError('Pengajuan belum dijurnal', 400);
      if (row.fins_reversal_trans_id) {
        return { already: true, fins_trans_id: Number(row.fins_trans_id), reversal_id: Number(row.fins_reversal_trans_id) };
      }
      const original = await client.query(
        `SELECT id, id_trans, nominal, coa_debet, coa_kredit, id_transaksi FROM fins_trans WHERE id = $1`,
        [row.fins_trans_id]
      );
      if (original.rowCount === 0) throw new JournalError('Transaksi asal tidak ditemukan', 404);
      const source = original.rows[0];
      const today = todayWib();
      const reversed = await postBalancedEntry(client, {
        tanggal: today,
        nominal: Number(source.nominal),
        coaDebet: source.coa_kredit,
        coaKredit: source.coa_debet,
        keterangan: `Jurnal balik ${source.id_trans}`,
        idTransaksi: `R${source.id_transaksi}`.slice(0, 30),
        idExre: `R${source.id_trans}`.slice(0, 20),
        nikInput: nik,
        jenis: 'e',
        mutasi: '3',
        note: `REVERSAL ${source.id_trans}`,
      });
      await client.query(
        `UPDATE disbursement_requests SET fins_reversal_trans_id = $1, updated_at = NOW() WHERE id = $2 AND fins_reversal_trans_id IS NULL`,
        [reversed.id, row.id]
      );
      return { already: false, fins_trans_id: Number(row.fins_trans_id), reversal_id: reversed.id, id_trans: reversed.idTrans };
    });

    await invalidateCache(['api:penyaluran:requests', 'api:penyaluran:dashboard']);
    return NextResponse.json(result);
  } catch (error: any) {
    return fail(error);
  }
}
