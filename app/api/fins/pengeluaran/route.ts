import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, withTransaction } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { postTransaksi } from '@/lib/fins/posting';
import { z } from 'zod';

const expenseItemSchema = z.object({
  keterangan: z.string().trim().min(1, 'Keterangan item wajib diisi'),
  qty: z.coerce.number().int().min(1).default(1),
  satuan: z.string().trim().default('pcs'),
  hargaSatuan: z.coerce.number().positive('Harga satuan harus > 0'),
  subtotal: z.coerce.number().positive('Subtotal harus > 0'),
  coa: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional().default(''),
});

const createExpenseSchema = z.object({
  judul: z.string().trim().min(3, 'Judul pengeluaran minimal 3 karakter').max(300),
  jenis: z.enum(['reimbursement', 'pembayaran_langsung', 'kasbon_settlement', 'operasional_rutin']).default('operasional_rutin'),
  coaDebet: z.string().trim().min(1, 'Pilih akun beban (debet)'),
  coaKredit: z.string().trim().min(1, 'Pilih akun kas/bank (kredit)'),
  campaignId: z.coerce.number().int().positive().nullable().optional(),
  tglPengajuan: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal YYYY-MM-DD'),
  metodeBayar: z.string().trim().default('bank'),
  items: z.array(expenseItemSchema).min(1, 'Minimal 1 item rincian belanja'),
});

function generateExpenseNumber() {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${yymm}-${random4}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';

  try {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (status !== 'all') {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    const sql = `
      SELECT e.*, c.title AS campaign_title
      FROM expense_requests e
      LEFT JOIN campaigns c ON c.id = e.campaign_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.created_at DESC
      LIMIT 100
    `;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Expense Requests GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userName = session.user?.name || 'User';

  try {
    const rawBody = await req.json();
    const validated = createExpenseSchema.parse(rawBody);

    const nomorExpense = generateExpenseNumber();
    const totalAmount = validated.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    const result = await withTransaction(async (client) => {
      // Insert expense_requests
      const reqRes = await client.query(
        `INSERT INTO expense_requests (
           nomor_expense, judul, jenis, total_amount, campaign_id,
           coa_debet, coa_kredit, status, nik_pengaju, tgl_pengajuan, metode_bayar
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10)
         RETURNING id, nomor_expense`,
        [
          nomorExpense,
          validated.judul,
          validated.jenis,
          totalAmount,
          validated.campaignId || null,
          validated.coaDebet,
          validated.coaKredit,
          userName.slice(0, 50),
          validated.tglPengajuan,
          validated.metodeBayar,
        ]
      );

      const requestId = Number(reqRes.rows[0].id);

      // Insert expense_items
      for (const item of validated.items) {
        await client.query(
          `INSERT INTO expense_items (
             expense_request_id, keterangan, qty, satuan, harga_satuan, subtotal, coa, receipt_url
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            requestId,
            item.keterangan,
            item.qty,
            item.satuan,
            item.hargaSatuan,
            item.subtotal,
            item.coa || validated.coaDebet,
            item.receiptUrl || '',
          ]
        );
      }

      return { id: requestId, nomor_expense: nomorExpense };
    });

    try {
      await invalidateCache(['fins:expense:list', 'fins:dashboard-cash']);
    } catch (e) {
      console.warn('Redis flush error in expense post:', e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

