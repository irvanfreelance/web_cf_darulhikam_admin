-- ============================================================================
-- Migrasi Aditif 28: Kelengkapan Tabel & Relasi Penyaluran & CRM
-- Aman dijalankan berulang kali (Idempoten, IF NOT EXISTS).
-- ============================================================================

-- 1. disbursement_items: Rincian item per pengajuan penyaluran (P04a)
CREATE TABLE IF NOT EXISTS disbursement_items (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
  keterangan              varchar(300)  NOT NULL,
  qty                     numeric(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  satuan                  varchar(30),
  harga_satuan            bigint        NOT NULL CHECK (harga_satuan >= 0),
  subtotal                bigint        GENERATED ALWAYS AS (ROUND(qty * harga_satuan)::bigint) STORED,
  coa                     varchar(14)   NOT NULL,
  keterangan_coa          varchar(100),
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_items_req ON disbursement_items (disbursement_request_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_items_coa ON disbursement_items (coa);

-- 2. disbursement_proofs: Dokumen bukti penyaluran/LPJ (P07)
CREATE TABLE IF NOT EXISTS disbursement_proofs (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
  jenis_dokumen           varchar(20)   NOT NULL CHECK (jenis_dokumen IN ('foto','video','tanda_terima','berita_acara','kwitansi','lainnya')),
  file_url                text          NOT NULL,
  caption                 varchar(300),
  uploaded_by             varchar(20)   NOT NULL,
  uploaded_at             timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_proofs_req ON disbursement_proofs (disbursement_request_id);

-- 3. disbursement_recipients: Daftar penerima per penyaluran massal (P06)
CREATE TABLE IF NOT EXISTS disbursement_recipients (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
  beneficiary_id          bigint        REFERENCES beneficiaries(id) ON DELETE SET NULL,
  nama_penerima           varchar(200)  NOT NULL,
  jumlah_diterima         bigint        NOT NULL CHECK (jumlah_diterima > 0),
  satuan                  varchar(30)   DEFAULT 'rupiah',
  tgl_terima              date,
  lokasi_penyaluran       varchar(200),
  tanda_terima_url        text,
  keterangan              varchar(300),
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disb_recipients_req         ON disbursement_recipients (disbursement_request_id);
CREATE INDEX IF NOT EXISTS idx_disb_recipients_beneficiary ON disbursement_recipients (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disb_recipients_tgl         ON disbursement_recipients (tgl_terima DESC);

-- 4. Pastikan kolom pendukung pada disbursement_lpj jika belum ada
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS judul varchar(300);
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS tgl_kegiatan date;
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS jumlah_realisasi bigint;
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS narasi text;
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS disusun_oleh varchar(150);
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'draft';
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS reviewer varchar(150);
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS catatan_review text;
ALTER TABLE disbursement_lpj ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_disbursement_lpj_request ON disbursement_lpj (request_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_lpj_status ON disbursement_lpj (status);

