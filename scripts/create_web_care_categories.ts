import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Creating web_care_categories...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_care_categories (
        id bigserial PRIMARY KEY,
        icon_name varchar(50) NOT NULL DEFAULT 'Heart',
        icon_url text,
        label varchar(100) NOT NULL,
        quote_text text,
        quote_source varchar(150),
        description text,
        photo_url text,
        is_active boolean NOT NULL DEFAULT true,
        display_order smallint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    console.log('✅ Table ready.');

    // Seed with the copy currently hardcoded on the public site, only if empty.
    const check = await pool.query('SELECT id FROM web_care_categories LIMIT 1');
    if (check.rows.length === 0) {
      const categories = [
        ['GraduationCap', 'Peduli Pendidikan'],
        ['HandCoins', 'Peduli Ekonomi'],
        ['Leaf', 'Peduli Lingkungan'],
        ['HeartPulse', 'Peduli Kesehatan'],
        ['Users', 'Peduli Umat'],
        ['MoonStar', 'Program Khusus'],
      ];
      for (let i = 0; i < categories.length; i++) {
        await pool.query(
          `INSERT INTO web_care_categories (icon_name, label, display_order) VALUES ($1, $2, $3)`,
          [categories[i][0], categories[i][1], i + 1]
        );
      }
      console.log('✅ Seeded web_care_categories (quote/description/photo left empty — fill in via /web-care-categories).');
    } else {
      console.log('↷ web_care_categories already has data, skipped seeding.');
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
