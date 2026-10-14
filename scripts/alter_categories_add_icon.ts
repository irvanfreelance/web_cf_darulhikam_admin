import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// Adds icon + ordering columns to campaign `categories`, and backfills
// icon_url on care/impact categories that still rely on the static lucide
// fallback, using the icons already seeded in web_icon_library (label = lucide name).
async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Altering categories...');
    await pool.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS icon_url text,
        ADD COLUMN IF NOT EXISTS icon_name varchar(50),
        ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;
    `);
    await pool.query(`UPDATE categories SET display_order = id WHERE display_order = 0`);

    console.log('⏳ Backfilling web_care_categories.icon_url from icon_name...');
    const care = await pool.query(`
      UPDATE web_care_categories c
      SET icon_url = l.url
      FROM web_icon_library l
      WHERE c.icon_url IS NULL AND l.label = c.icon_name
    `);
    console.log(`  care rows updated: ${care.rowCount}`);

    console.log('⏳ Backfilling web_impact_categories.icon_url from label...');
    const impactMap: [string, string][] = [
      ['Peduli Pendidikan', 'GraduationCap'],
      ['Peduli Lingkungan', 'Leaf'],
      ['Peduli Umat', 'Users'],
      ['Peduli Kesehatan', 'HeartPulse'],
      ['Peduli Ekonomi', 'HandCoins'],
      ['Program Khusus', 'MoonStar'],
    ];
    let impactCount = 0;
    for (const [label, iconLabel] of impactMap) {
      const r = await pool.query(
        `UPDATE web_impact_categories i
         SET icon_url = l.url
         FROM web_icon_library l
         WHERE i.icon_url IS NULL AND i.label = $1 AND l.label = $2`,
        [label, iconLabel]
      );
      impactCount += r.rowCount ?? 0;
    }
    console.log(`  impact rows updated: ${impactCount}`);

    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();
