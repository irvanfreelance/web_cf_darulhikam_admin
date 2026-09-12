import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { z } from 'zod';

// Rows are parsed client-side (XLSX.utils.sheet_to_json) and posted as JSON,
// same shape as app/api/transactions/import/route.ts.
const importRowSchema = z.object({
  coa: z.coerce.string().min(1).max(14),
  nama_coa: z.coerce.string().min(2).max(200),
  coa_parent: z.coerce.string().optional().default(''),
  group_coa: z.coerce.string().optional().default(''),
  id_kantor: z.coerce.string().optional().default(''),
  id_jabatan: z.coerce.string().optional().default(''),
  active: z.enum(['y', 'n']).default('y'),
  saldo: z.enum(['d', 'k']),
  is_postable: z.boolean().default(true),
});

const bulkImportSchema = z.object({
  rows: z.array(importRowSchema).min(1, 'Tidak ada baris untuk diimport'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rows } = bulkImportSchema.parse(body);

    let imported = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    await withTransaction(async (client) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const level = (!r.coa_parent || r.coa_parent === '0') ? 1 : null;
          const res = await client.query(
            `INSERT INTO fins_coa (coa, nama_coa, coa_parent, level, id_kantor, id_jabatan, group_coa, parent, active, saldo)
             VALUES ($1, $2, $3, COALESCE($4, 1), $5, $6, $7, $8, $9, $10)
             ON CONFLICT (coa) DO UPDATE SET
               nama_coa = EXCLUDED.nama_coa,
               coa_parent = EXCLUDED.coa_parent,
               id_kantor = EXCLUDED.id_kantor,
               id_jabatan = EXCLUDED.id_jabatan,
               group_coa = EXCLUDED.group_coa,
               parent = EXCLUDED.parent,
               active = EXCLUDED.active,
               saldo = EXCLUDED.saldo
             RETURNING (xmax = 0) AS inserted`,
            [r.coa, r.nama_coa, r.coa_parent, level, r.id_kantor, r.id_jabatan, r.group_coa, r.is_postable ? 'n' : 'y', r.active, r.saldo]
          );
          if (res.rows[0].inserted) imported++; else updated++;
        } catch (e: any) {
          errors.push({ row: i + 1, message: e.message });
        }
      }

      // Recompute level for every row bottom-up (roots first) now that all
      // parent links exist, then fix up each parent's postable flag.
      let changed = true;
      let guard = 0;
      while (changed && guard < 20) {
        changed = false;
        guard++;
        const res = await client.query(`
          UPDATE fins_coa c
          SET level = CASE WHEN c.coa_parent = '' OR c.coa_parent = '0' THEN 1 ELSE p.level + 1 END
          FROM fins_coa p
          WHERE (c.coa_parent = p.coa OR c.coa_parent = '' OR c.coa_parent = '0')
            AND c.level IS DISTINCT FROM (CASE WHEN c.coa_parent = '' OR c.coa_parent = '0' THEN 1 ELSE p.level + 1 END)
          RETURNING c.coa
        `);
        if (res.rows.length > 0) changed = true;
      }

      await client.query(`
        UPDATE fins_coa SET parent = 'y'
        WHERE coa IN (SELECT DISTINCT coa_parent FROM fins_coa WHERE coa_parent != '' AND coa_parent != '0')
      `);
    });

    return NextResponse.json({ imported, updated, skipped: errors.length, errors });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
