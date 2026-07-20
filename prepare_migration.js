const fs = require('fs');
const path = require('path');

const erdPath = path.join(__dirname, 'refs', 'erd_web.md');
const cfPath = path.join(__dirname, 'refs', 'cf_darulhikam.sql');
const outPath = path.join(__dirname, 'scratch', 'migration.sql');

if (!fs.existsSync(path.join(__dirname, 'scratch'))) {
  fs.mkdirSync(path.join(__dirname, 'scratch'));
}

// Read CF schema
let cfSql = fs.readFileSync(cfPath, 'utf8');

// Insert additional admins so that foreign keys for authors/creators (IDs 3,4,5) work
cfSql = cfSql.replace(
  /\(2, 'Asep', 'imanhost08@gmail\.com', '\$2a\$12\$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51\.048594\+00'\);/,
  `(2, 'Asep', 'imanhost08@gmail.com', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(3, 'M. Fauzi', 'fauzi@lazdarulhikam.org', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(4, 'Rini Nurhayati', 'rini@lazdarulhikam.org', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(5, 'Dian Pratiwi', 'dian@lazdarulhikam.org', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00');`
);

// Read ERD and extract SQL
const erdMd = fs.readFileSync(erdPath, 'utf8');
const sqlMatch = erdMd.match(/```sql\n([\s\S]*?)```/);
if (!sqlMatch) {
  console.error("No SQL block found in erd_web.md");
  process.exit(1);
}
let erdSql = sqlMatch[1];

// 1. Remove web_users table and seeds
erdSql = erdSql.replace(/CREATE TABLE web_users[\s\S]*?(?=-- ============================================================)/g, '');

// 2. Remove web_programs table and seeds
erdSql = erdSql.replace(/CREATE TABLE web_programs[\s\S]*?(?=-- ============================================================)/g, '');

// Clean up dangling headers that were left behind
erdSql = erdSql.replace(/-- ============================================================\s+-- ============================================================/g, '-- ============================================================');

// 3. Replace foreign keys pointing to web_users -> admins
erdSql = erdSql.replace(/REFERENCES web_users\s*\(id\)/g, 'REFERENCES admins(id)');

// 4. Replace foreign keys pointing to web_programs -> campaigns
erdSql = erdSql.replace(/REFERENCES web_programs\s*\(id\)/g, 'REFERENCES campaigns(id)');

// 5. Fix invalid index on web_articles that uses missing display_order
erdSql = erdSql.replace(/CREATE INDEX idx_art_featured\s*ON web_articles\s*\(display_order\)/, "CREATE INDEX idx_art_featured ON web_articles (published_at DESC)");

// 6. Fix invalid index on web_cms_audit_log that uses NOW()
erdSql = erdSql.replace(/CREATE INDEX idx_audit_recent\s*ON web_cms_audit_log \(created_at DESC\) WHERE created_at > NOW\(\) - INTERVAL '90 days';/, "CREATE INDEX idx_audit_recent ON web_cms_audit_log (created_at DESC);");

// 7. Remove trigger for web_users and web_programs
erdSql = erdSql.replace(/CREATE TRIGGER trg_users_updated_at[\s\S]*?ON web_users[\s\S]*?;/, "");
erdSql = erdSql.replace(/CREATE TRIGGER trg_programs_updated_at[\s\S]*?ON web_programs[\s\S]*?;/, "");

// 8. Replace web_users with admins and web_programs with campaigns in views
erdSql = erdSql.replace(/JOIN\s+web_users\s+u\s+ON/g, "JOIN admins u ON");
erdSql = erdSql.replace(/JOIN\s+web_programs\s+p\s+ON/g, "JOIN campaigns p ON");
erdSql = erdSql.replace(/entity_type\s+VARCHAR\(60\)\s+NOT NULL,\s+--\s+e\.g\.\s+'web_programs'/g, "entity_type VARCHAR(60) NOT NULL, -- e.g. 'campaigns'");

// 9. Remove v_active_programs view as it references non-existent columns in campaigns
erdSql = erdSql.replace(/CREATE OR REPLACE VIEW v_active_programs AS[\s\S]*?ORDER BY p\.display_order;/g, "");

// Concatenate
const finalSql = `-- ======================\n-- MIGRATION & SEED START\n-- ======================\n\n${cfSql}\n\n-- ======================\n-- WEB SCHEMA & SEED\n-- ======================\n\n${erdSql}`;

fs.writeFileSync(outPath, finalSql);
console.log(`Successfully generated migration script at ${outPath}`);
