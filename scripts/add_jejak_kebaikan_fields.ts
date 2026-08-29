import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Running migration...');
    await pool.query(`ALTER TABLE ngo_configs ADD COLUMN IF NOT EXISTS jejak_kebaikan_title varchar(150) DEFAULT 'Jejak Kebaikan';`);
    await pool.query(`ALTER TABLE ngo_configs ADD COLUMN IF NOT EXISTS jejak_kebaikan_subtitle varchar(150);`);
    await pool.query(`UPDATE ngo_configs SET jejak_kebaikan_subtitle = ngo_name WHERE jejak_kebaikan_subtitle IS NULL;`);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();
