import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });


async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('⏳ Starting database seeding...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '../refs/9maydonasi.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split SQL by semicolons, but be careful with functions/triggers if any
    // For this specific SQL, it's mostly tables and inserts.
    // However, Neon/Postgres can handle large blobs of SQL if sent as one.
    
    console.log('🚀 Executing SQL...');
    await pool.query(sql);
    
    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
