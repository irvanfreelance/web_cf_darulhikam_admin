import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// categories was seeded with explicit ids (1-8) so its id sequence never advanced,
// causing "duplicate key ... categories_pkey" on insert. Re-sync the sequence to MAX(id)+1.
// The sequence may not be OWNED BY the column (pg_get_serial_sequence returns null),
// so resolve it from the column default `nextval('...'::regclass)` instead.
async function fix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const col = await pool.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'id'`
    );
    const def: string | null = col.rows[0]?.column_default ?? null;
    console.log('Column default:', def);
    const match = def?.match(/nextval\('([^']+)'/);
    if (!match) throw new Error('categories.id has no nextval() default; nothing to fix');
    const seq = match[1].replace(/::regclass$/, '');
    console.log('Sequence:', seq);

    const max = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM categories`);
    console.log('MAX(id):', max.rows[0].max_id);

    const res = await pool.query(
      `SELECT setval($1::regclass, $2::bigint, false) AS next_id`,
      [seq, Number(max.rows[0].max_id) + 1]
    );
    console.log('✅ Next id will be:', res.rows[0].next_id);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
fix();
