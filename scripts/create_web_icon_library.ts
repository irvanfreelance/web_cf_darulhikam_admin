import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Creating web_icon_library...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_icon_library (
        id bigserial PRIMARY KEY,
        url text NOT NULL,
        label varchar(100),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    console.log('✅ Table ready.');
    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();
