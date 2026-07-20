import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
import { config } from 'dotenv';
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const query = (text: string) => pool.query(text);
config({ path: '.env.local' });

async function migrate() {
  try {
    console.log("Creating web_article_categories...");
    await query(`
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

    console.log("Inserting default categories...");
    await query(`
      INSERT INTO web_article_categories (name, slug) 
      VALUES 
        ('Berita Program', 'berita-program'),
        ('Kisah Inspiratif', 'kisah-inspiratif'),
        ('Edukasi Zakat', 'edukasi-zakat'),
        ('Laporan Lapangan', 'laporan-lapangan')
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log("Altering web_articles to add category_id...");
    await query(`
      ALTER TABLE web_articles 
      ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES web_article_categories(id) ON DELETE SET NULL;
    `);

    console.log("Mapping existing articles to new categories...");
    await query(`
      UPDATE web_articles 
      SET category_id = (SELECT id FROM web_article_categories WHERE slug = 'berita-program' LIMIT 1)
      WHERE category_id IS NULL;
    `);

    console.log("Dropping view...");
    await query(`DROP VIEW IF EXISTS v_published_articles CASCADE;`);

    console.log("Dropping old category column...");
    await query(`
      ALTER TABLE web_articles DROP COLUMN IF EXISTS category;
    `);

    console.log("Recreating view...");
    await query(`
      CREATE OR REPLACE VIEW v_published_articles AS
      SELECT
          a.id,
          a.slug,
          a.title,
          a.title_long,
          a.excerpt,
          c.name as category_name,
          a.category_id,
          a.read_time_min,
          a.featured_image_url,
          a.featured_image_alt,
          a.featured_image_caption,
          a.featured_image_width,
          a.featured_image_height,
          a.published_at,
          u.name as author_name,
          NULL as author_avatar_url
      FROM web_articles a
      JOIN admins u ON a.author_id = u.id
      LEFT JOIN web_article_categories c ON a.category_id = c.id
      WHERE a.status = 'published' AND a.deleted_at IS NULL;
    `);

    console.log("Migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
