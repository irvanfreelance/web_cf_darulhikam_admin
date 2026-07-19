import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Running migration...');
    await pool.query('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sort INT DEFAULT 0;');
    await pool.query('ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS sort INT DEFAULT 0;');
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}
migrate();
