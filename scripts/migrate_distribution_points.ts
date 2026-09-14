import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// Idempotent, additive-only migration for web_distribution_points — safe to
// re-run any number of times, never drops or touches existing data/tables.
const SQL = `
CREATE TABLE IF NOT EXISTS web_distribution_points (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    type            VARCHAR(20)     NOT NULL DEFAULT 'province',
    latitude        NUMERIC(10,6)   NOT NULL,
    longitude       NUMERIC(10,6)   NOT NULL,
    description     TEXT,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    updated_by      BIGINT          REFERENCES admins(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribution_points_active ON web_distribution_points (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_distribution_points_order  ON web_distribution_points (display_order);
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(SQL);
    console.log('✅ web_distribution_points table ready (created if missing, untouched if existing).');
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();
