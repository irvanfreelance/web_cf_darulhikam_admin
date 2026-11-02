-- ============================================================================
-- 27_bot_s04_additive.sql
-- Phase 4. Hanya CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- dan CREATE INDEX IF NOT EXISTS.
-- ============================================================================

ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS fins_reversal_trans_id bigint;
CREATE INDEX IF NOT EXISTS idx_disbursement_reversal ON disbursement_requests (fins_reversal_trans_id) WHERE fins_reversal_trans_id IS NOT NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fins_trans_id bigint;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fins_synced_at timestamptz;

ALTER TABLE donor_routines ADD COLUMN IF NOT EXISTS mulai date DEFAULT CURRENT_DATE;
ALTER TABLE donor_routines ADD COLUMN IF NOT EXISTS next_due date;
ALTER TABLE donor_routines ADD COLUMN IF NOT EXISTS catatan text;
CREATE INDEX IF NOT EXISTS idx_donor_routines_due ON donor_routines (next_due) WHERE aktif IS DISTINCT FROM false;

CREATE TABLE IF NOT EXISTS donation_certificates (
  id                bigserial     PRIMARY KEY,
  nomor_sertifikat  varchar(50)   NOT NULL UNIQUE,
  donor_id          bigint        REFERENCES donors (id),
  nama_donatur      varchar(200)  NOT NULL,
  email_donatur     varchar(150),
  npwp_donatur      varchar(20),
  tahun_donasi      smallint      NOT NULL,
  total_donasi      bigint        NOT NULL CHECK (total_donasi > 0),
  total_zakat       bigint        NOT NULL DEFAULT 0,
  total_infaq       bigint        NOT NULL DEFAULT 0,
  total_qurban      bigint        NOT NULL DEFAULT 0,
  total_lainnya     bigint        NOT NULL DEFAULT 0,
  jumlah_transaksi  int           NOT NULL DEFAULT 0,
  campaign_ids      bigint[],
  pdf_url           text,
  sent_at           timestamptz,
  sent_via          varchar(10)   DEFAULT 'manual'
                      CHECK (sent_via IS NULL OR sent_via IN ('email', 'whatsapp', 'manual')),
  issued_by         varchar(20)   NOT NULL,
  issued_at         timestamptz   NOT NULL DEFAULT NOW(),
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (donor_id, tahun_donasi)
);

CREATE INDEX IF NOT EXISTS idx_cert_donor ON donation_certificates (donor_id) WHERE donor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cert_tahun ON donation_certificates (tahun_donasi DESC);
