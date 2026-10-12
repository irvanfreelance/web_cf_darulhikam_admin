import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
import { config } from 'dotenv';
config({ path: '.env.local' });
if (!process.env.DATABASE_URL) config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Trim article title_long if > 255
    await client.query("UPDATE web_articles SET title_long = LEFT(TRIM(title_long), 255) WHERE LENGTH(title_long) > 255");

    console.log('Dropping dependent views...');
    await client.query('DROP VIEW IF EXISTS v_article_seo CASCADE;');
    await client.query('DROP VIEW IF EXISTS v_published_articles CASCADE;');

    console.log('Altering web_articles column types...');
    await client.query(`
      ALTER TABLE web_articles 
        ALTER COLUMN title TYPE VARCHAR(255),
        ALTER COLUMN title_long TYPE VARCHAR(255),
        ALTER COLUMN excerpt TYPE VARCHAR(500),
        ALTER COLUMN seo_title TYPE VARCHAR(255),
        ALTER COLUMN seo_description TYPE VARCHAR(500);
    `);

    console.log('Recreating v_published_articles...');
    await client.query(`
      CREATE OR REPLACE VIEW v_published_articles AS
      SELECT 
        a.id,
        a.slug,
        a.title,
        a.title_long,
        a.excerpt,
        c.name AS category_name,
        a.category_id,
        a.read_time_min,
        a.featured_image_url,
        a.featured_image_alt,
        a.featured_image_caption,
        a.featured_image_width,
        a.featured_image_height,
        a.published_at,
        u.name AS author_name,
        NULL::text AS author_avatar_url
      FROM web_articles a
      JOIN admins u ON a.author_id = u.id
      LEFT JOIN web_article_categories c ON a.category_id = c.id
      WHERE a.status = 'published' AND a.deleted_at IS NULL;
    `);

    console.log('Recreating v_article_seo...');
    await client.query(`
      CREATE OR REPLACE VIEW v_article_seo AS
      SELECT 
        id,
        slug,
        COALESCE(seo_title, title) AS meta_title,
        COALESCE(seo_description, excerpt) AS meta_description,
        COALESCE(og_image_url, featured_image_url) AS og_image,
        COALESCE(og_image_alt, featured_image_alt) AS og_image_alt,
        canonical_url,
        robots_directive,
        locale,
        schema_org_json,
        published_at,
        updated_at,
        featured_image_url IS NULL AS flag_missing_og_image,
        featured_image_alt IS NULL OR featured_image_alt = '' AS flag_missing_alt_text,
        length(COALESCE(seo_title, title)) > 60 AS flag_title_too_long,
        length(COALESCE(seo_description, excerpt)) > 155 AS flag_desc_too_long,
        schema_org_json IS NULL AS flag_missing_schema_org,
        canonical_url IS NOT NULL AS has_canonical_override
      FROM web_articles
      WHERE deleted_at IS NULL
      ORDER BY published_at DESC NULLS LAST;
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
