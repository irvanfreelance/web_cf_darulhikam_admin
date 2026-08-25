-- ============================================================
-- FINS × Crowdfunding Integration — Schema Layer
-- Menambahkan kolom penghubung dan tabel junction antara
-- crowdfunding schema dan FINS schema.
--
-- URUTAN EKSEKUSI:
--   1. crowdfunding schema + seed  (sudah ada)
--   2. 01_fins_schema_postgres.sql
--   3. 02_fins_crowdfunding_integration.sql  ← file ini
--   4. 04_fins_seed_aligned.sql
--   5. 05_fins_deferred_fk.sql
--
-- CATATAN: FK constraint untuk kolom baru (fins_coa_debet,
-- fins_bank_rek_id, fins_trans_id) TIDAK ditambahkan di sini.
-- Kolom ditambahkan sebagai plain type karena seed fins_coa
-- dan fins_bank_rek belum berjalan. FK ditambahkan di file 05
-- setelah seluruh seed data selesai.
-- ============================================================

-- ============================================================
-- 1. TAMBAHAN KOLOM: invoices → fins_trans_id
--    Setiap invoice PAID terhubung ke fins_trans (jurnal penerimaan)
--    FK constraint → 05_fins_deferred_fk.sql
-- ============================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS fins_trans_id bigint;  -- FK ke fins_trans.id, ditambah di file 05

COMMENT ON COLUMN invoices.fins_trans_id
  IS '[fins] fins_trans.id jurnal penerimaan yang dibuat saat invoice PAID';

CREATE INDEX IF NOT EXISTS idx_invoices_fins_trans
  ON invoices (fins_trans_id)
  WHERE fins_trans_id IS NOT NULL;

-- ============================================================
-- 2. TAMBAHAN KOLOM: payment_methods → fins mapping
--    FK constraint → 05_fins_deferred_fk.sql
-- ============================================================
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS fins_coa_debet   varchar(14),  -- FK ke fins_coa.coa, file 05
  ADD COLUMN IF NOT EXISTS fins_mutasi      varchar(2),   -- kode mutasi FINS
  ADD COLUMN IF NOT EXISTS fins_bank_rek_id varchar(50);  -- FK ke fins_bank_rek.id_rekening, file 05

COMMENT ON COLUMN payment_methods.fins_coa_debet
  IS '[fins] COA bank/digital yang didebet saat settlement diterima';
COMMENT ON COLUMN payment_methods.fins_mutasi
  IS '[fins] Kode mutasi: 2=bank VA, 3=manual TF, 4=QRIS, 6=retail, e=ewallet';
COMMENT ON COLUMN payment_methods.fins_bank_rek_id
  IS '[fins] Rekening settlement yang menerima dana channel ini';

CREATE INDEX IF NOT EXISTS idx_payment_methods_fins_coa
  ON payment_methods (fins_coa_debet)
  WHERE fins_coa_debet IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_fins_rek
  ON payment_methods (fins_bank_rek_id)
  WHERE fins_bank_rek_id IS NOT NULL;

-- ============================================================
-- 3. TABEL BARU: fins_campaign_coa
--    Mapping campaign crowdfunding → COA akuntansi FINS
--    Menentukan COA penerimaan, dana (ekuitas), dan penyaluran
--    per campaign.
--
--    CATATAN: FK ke fins_coa dan campaigns valid karena
--    kedua table sudah ada sebelum file ini berjalan.
--    Seed data → 04_fins_seed_aligned.sql Section 8.
-- ============================================================
DROP TABLE IF EXISTS fins_campaign_coa CASCADE;
CREATE TABLE fins_campaign_coa (
  id            bigserial    PRIMARY KEY,
  campaign_id   bigint       NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  coa_receipt   varchar(14)  NOT NULL,   -- FK → fins_coa.coa ditambah di file 05
  coa_fund      varchar(14),             -- FK → fins_coa.coa ditambah di file 05
  coa_expense   varchar(14),             -- FK → fins_coa.coa ditambah di file 05
  is_primary    boolean      NOT NULL DEFAULT true,
  note          text,
  created_at    timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, coa_receipt)
);

COMMENT ON TABLE  fins_campaign_coa             IS 'Mapping campaign crowdfunding ke Chart of Accounts FINS';
COMMENT ON COLUMN fins_campaign_coa.coa_receipt IS 'COA penerimaan donasi (level 401.xx)';
COMMENT ON COLUMN fins_campaign_coa.coa_fund    IS 'COA dana/ekuitas (level 300.xx)';
COMMENT ON COLUMN fins_campaign_coa.coa_expense IS 'COA penyaluran (level 501.xx)';
COMMENT ON COLUMN fins_campaign_coa.is_primary  IS 'true = COA utama campaign (hanya 1 per campaign)';

CREATE INDEX idx_fins_campaign_coa_campaign ON fins_campaign_coa (campaign_id);
CREATE INDEX idx_fins_campaign_coa_receipt  ON fins_campaign_coa (coa_receipt);
CREATE INDEX idx_fins_campaign_coa_fund     ON fins_campaign_coa (coa_fund)    WHERE coa_fund IS NOT NULL;

-- ============================================================
-- 4. TABEL BARU: fins_invoice_admin_fee
--    Pemisahan base_amount vs admin_fee per invoice untuk
--    kebutuhan jurnal akuntansi terpisah (reklasifikasi biaya admin)
-- ============================================================
DROP TABLE IF EXISTS fins_invoice_admin_fee CASCADE;
CREATE TABLE fins_invoice_admin_fee (
  id                      bigserial     PRIMARY KEY,
  invoice_id              bigint        NOT NULL,
  invoice_created_at      timestamptz   NOT NULL,
  base_amount             bigint        NOT NULL CHECK (base_amount > 0),
  admin_fee               bigint        NOT NULL DEFAULT 0 CHECK (admin_fee >= 0),
  total_amount            bigint        NOT NULL,
  fins_trans_id           bigint        REFERENCES fins_trans(id)  ON DELETE SET NULL,
  fins_trans_fee_id       bigint        REFERENCES fins_trans(id)  ON DELETE SET NULL,
  coa_receipt             varchar(14),   -- FK → fins_coa.coa di file 05
  coa_fee                 varchar(14),   -- FK → fins_coa.coa di file 05
  coa_bank                varchar(14),   -- FK → fins_coa.coa di file 05
  payment_method_code     varchar(20),
  created_at              timestamptz   NOT NULL DEFAULT NOW(),
  FOREIGN KEY (invoice_id, invoice_created_at)
    REFERENCES invoices(id, created_at) ON DELETE CASCADE
);

COMMENT ON TABLE  fins_invoice_admin_fee
  IS 'Detail split base_amount vs admin_fee per invoice untuk akuntansi';
COMMENT ON COLUMN fins_invoice_admin_fee.fins_trans_id
  IS 'fins_trans utama: jurnal penerimaan donasi (base_amount)';
COMMENT ON COLUMN fins_invoice_admin_fee.fins_trans_fee_id
  IS 'fins_trans fee: jurnal reklasifikasi admin fee (admin_fee)';

CREATE INDEX idx_fins_inv_fee_invoice   ON fins_invoice_admin_fee (invoice_id, invoice_created_at);
CREATE INDEX idx_fins_inv_fee_trans     ON fins_invoice_admin_fee (fins_trans_id)     WHERE fins_trans_id IS NOT NULL;
CREATE INDEX idx_fins_inv_fee_trans_fee ON fins_invoice_admin_fee (fins_trans_fee_id) WHERE fins_trans_fee_id IS NOT NULL;

-- ============================================================
-- 5. TABEL BARU: fins_campaign_budget_summary
--    Snapshot penerimaan aktual per campaign, diupdate oleh
--    Upstash Workflow setiap ada fins_trans penerimaan baru.
-- ============================================================
DROP TABLE IF EXISTS fins_campaign_budget_summary CASCADE;
CREATE TABLE fins_campaign_budget_summary (
  campaign_id       bigint        PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  target_amount     bigint        NOT NULL DEFAULT 0,
  collected_amount  bigint        NOT NULL DEFAULT 0,
  pct_collected     numeric(6,2)  GENERATED ALWAYS AS (
    CASE WHEN target_amount > 0
      THEN ROUND((collected_amount::numeric / target_amount::numeric) * 100, 2)
      ELSE 0
    END
  ) STORED,
  fins_jurnal_count int           NOT NULL DEFAULT 0,
  last_donation_at  timestamptz,
  last_synced_at    timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  fins_campaign_budget_summary
  IS 'Snapshot ringkasan penerimaan per campaign — diupdate Upstash Workflow';
COMMENT ON COLUMN fins_campaign_budget_summary.pct_collected
  IS 'Persentase target tercapai (kolom generated, otomatis)';

CREATE INDEX idx_fins_campaign_budget_pct
  ON fins_campaign_budget_summary (pct_collected DESC);
