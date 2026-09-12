-- ============================================================================
-- 21_fins_saldo_dana_active.sql
-- FINS > Home > Setting Configuration > Saldo Dana
-- Adds an independent Aktif/Non-Aktif toggle to fins_saldo_dana mappings
-- (01_fins_schema_postgres.sql TABLE 4) — the mapping's own active state is
-- separate from whether the underlying fins_coa account itself is active.
-- Applied to the live Neon DB on 2026-09-12 (8 existing rows defaulted to 'y').
-- ============================================================================

ALTER TABLE fins_saldo_dana ADD COLUMN IF NOT EXISTS active varchar(1) NOT NULL DEFAULT 'y';
ALTER TABLE fins_saldo_dana DROP CONSTRAINT IF EXISTS fins_saldo_dana_active_check;
ALTER TABLE fins_saldo_dana ADD CONSTRAINT fins_saldo_dana_active_check CHECK (active IN ('y','n'));

COMMENT ON COLUMN fins_saldo_dana.active IS 'y=mapping aktif, n=non-aktif (independen dari status fins_coa.active)';
