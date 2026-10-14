import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// categories was seeded with explicit ids (1-8) so its id sequence never advanced,
// causing "duplicate key ... categories_pkey" on insert. Re-sync the sequence to MAX(id)+1.
async function fix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const seq = await pool.query(`SELECT pg_get_serial_sequence('categories','id') AS name`);
    console.log('Sequence:', seq.rows[0].name);
    const before = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM categories`);
    console.log('MAX(id):', before.rows[0].max_id);

    const res = await pool.query(
      `SELECT setval(pg_get_serial_sequence('categories','id'), COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false) AS next_id`
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
