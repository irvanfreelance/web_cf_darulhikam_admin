import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Running migration...');
    await pool.query(`ALTER TABLE ngo_configs ADD COLUMN IF NOT EXISTS email varchar(150);`);
    await pool.query(`ALTER TABLE ngo_configs ADD COLUMN IF NOT EXISTS office_hours varchar(255);`);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();
