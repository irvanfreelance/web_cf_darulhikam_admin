const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Creating web_article_categories...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS web_article_categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Insert default categories
    console.log("Inserting default categories...");
    await client.query(`
      INSERT INTO web_article_categories (name, slug) 
      VALUES 
        ('Berita Program', 'berita-program'),
        ('Kisah Inspiratif', 'kisah-inspiratif'),
        ('Edukasi Zakat', 'edukasi-zakat'),
        ('Laporan Lapangan', 'laporan-lapangan')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Alter web_articles
    console.log("Altering web_articles...");
    
    // First, add the column if it doesn't exist
    await client.query(`
      ALTER TABLE web_articles 
      ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES web_article_categories(id) ON DELETE SET NULL;
    `);

    // Assign default category_id to existing articles
    console.log("Mapping existing articles to new categories...");
    await client.query(`
      UPDATE web_articles 
      SET category_id = (SELECT id FROM web_article_categories WHERE slug = 'berita-program' LIMIT 1)
      WHERE category_id IS NULL;
    `);

    // Drop old category column if it exists
    await client.query(`
      ALTER TABLE web_articles DROP COLUMN IF EXISTS category;
    `);

    await client.query('COMMIT');
    console.log("Migration successful!");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
