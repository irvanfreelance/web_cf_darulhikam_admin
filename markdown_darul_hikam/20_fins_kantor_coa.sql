-- ============================================================================
-- 20_fins_kantor_coa.sql
-- FINS > Home > Setting Configuration > COA Kantor
-- Pemetaan akun kas & non kas (COA) per kantor/cabang, dipakai sebagai default
-- akun saat transaksi kas/bank dicatat untuk kantor tertentu.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fins_kantor_coa (
  id            bigserial    PRIMARY KEY,
  id_kantor     int          NOT NULL REFERENCES fins_kantor(id) ON DELETE CASCADE,
  coa_cash      varchar(14)  NOT NULL REFERENCES fins_coa(coa) ON DELETE RESTRICT,
  coa_non_cash  varchar(14)  NOT NULL REFERENCES fins_coa(coa) ON DELETE RESTRICT,
  created_at    timestamptz  NOT NULL DEFAULT NOW(),
  updated_at    timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE (id_kantor)
);

COMMENT ON TABLE fins_kantor_coa IS 'Mapping COA kas/non-kas default per kantor/cabang';
