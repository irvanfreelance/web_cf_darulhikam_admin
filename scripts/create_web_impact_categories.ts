import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Creating web_impact_categories...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_impact_categories (
        id              BIGSERIAL PRIMARY KEY,
        icon_url        TEXT,
        label           VARCHAR(100)    NOT NULL,
        value           NUMERIC(15,2)   NOT NULL DEFAULT 0,
        suffix          VARCHAR(20)     DEFAULT '',
        display_order   SMALLINT        NOT NULL DEFAULT 0,
        is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
        updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_impact_categories_active ON web_impact_categories (is_active) WHERE is_active = TRUE;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_impact_categories_order  ON web_impact_categories (display_order);`);

    console.log('✅ Table ready.');

    // Seed with the copy currently hardcoded on the "Jejak Kebaikan" banner, only if empty.
    const check = await pool.query('SELECT id FROM web_impact_categories LIMIT 1');
    if (check.rows.length === 0) {
      const categories: [string, number, number][] = [
        ['Peduli Pendidikan', 8983, 1],
        ['Peduli Lingkungan', 16014, 2],
        ['Peduli Umat', 49678, 3],
        ['Peduli Kesehatan', 2941, 4],
        ['Peduli Ekonomi', 9849, 5],
        ['Program Khusus', 147298, 6],
      ];
      for (const [label, value, order] of categories) {
        await pool.query(
          `INSERT INTO web_impact_categories (label, value, display_order) VALUES ($1, $2, $3)`,
          [label, value, order]
        );
      }
      console.log('✅ Seeded web_impact_categories (icon_url left empty — set via /web-impact-categories icon picker).');
    } else {
      console.log('↷ web_impact_categories already has data, skipped seeding.');
    }

    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();
