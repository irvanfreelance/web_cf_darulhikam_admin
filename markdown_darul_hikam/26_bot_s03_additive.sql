-- ============================================================================
-- 26_bot_s03_additive.sql
-- Phase 3. Hanya CREATE TABLE IF NOT EXISTS dan CREATE INDEX IF NOT EXISTS.
-- Penerima aktual dan bukti realisasi. LPJ sudah ada di berkas 24.
-- Status realisasi memakai nilai disbursed yang sudah diizinkan berkas 25.
-- ============================================================================

CREATE TABLE IF NOT EXISTS disbursement_recipients (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL REFERENCES disbursement_requests (id),
  beneficiary_id          bigint        REFERENCES beneficiaries (id),
  nama_penerima           varchar(200)  NOT NULL,
  jumlah_diterima         bigint        NOT NULL CHECK (jumlah_diterima > 0),
  satuan                  varchar(30)   DEFAULT 'rupiah',
  tgl_terima              date,
  lokasi_penyaluran       varchar(200),
  tanda_terima_url        text,
  keterangan              varchar(300),
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disb_recipients_req ON disbursement_recipients (disbursement_request_id);
CREATE INDEX IF NOT EXISTS idx_disb_recipients_beneficiary ON disbursement_recipients (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disb_recipients_tgl ON disbursement_recipients (tgl_terima DESC);

CREATE TABLE IF NOT EXISTS disbursement_proofs (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL REFERENCES disbursement_requests (id),
  jenis_dokumen           varchar(20)   NOT NULL
                            CHECK (jenis_dokumen IN ('foto', 'video', 'tanda_terima', 'berita_acara', 'kwitansi', 'lainnya')),
  file_url                text          NOT NULL,
  caption                 varchar(300),
  uploaded_by             varchar(20)   NOT NULL,
  uploaded_at             timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_proofs_req ON disbursement_proofs (disbursement_request_id);
