-- ============================================================================
-- 25_bot_s02_additive.sql
-- Phase 2. Hanya CREATE TABLE IF NOT EXISTS dan CREATE INDEX IF NOT EXISTS.
-- Aman dijalankan ulang. Tidak mengubah tabel yang sudah terisi.
--
-- disbursement_requests dipakai pengajuan dan daftar penyaluran.
-- qurban_animals + qurban_shahibul dipakai daftar qurban.
-- Kolom verifikasi penerima manfaat sudah ada dari berkas 24.
-- FK ke fins_trans, fins_budget, dan invoice tidak dipasang di sini.
-- ============================================================================

CREATE TABLE IF NOT EXISTS disbursement_requests (
  id                bigserial     PRIMARY KEY,
  nomor_pengajuan   varchar(30)   NOT NULL UNIQUE,
  campaign_id       bigint        NOT NULL REFERENCES campaigns (id),
  beneficiary_id    bigint        REFERENCES beneficiaries (id),
  judul             varchar(300)  NOT NULL,
  deskripsi         text,
  jenis_penyaluran  varchar(20)   NOT NULL
                      CHECK (jenis_penyaluran IN ('transfer', 'tunai', 'barang', 'jasa', 'campuran')),
  jumlah_diajukan   bigint        NOT NULL CHECK (jumlah_diajukan > 0),
  jumlah_disetujui  bigint        CHECK (jumlah_disetujui IS NULL OR jumlah_disetujui >= 0),
  coa_debet         varchar(14)   NOT NULL,
  coa_kredit        varchar(14)   NOT NULL,
  status            varchar(15)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'disbursed', 'cancelled', 'rejected')),
  nik_pengaju       varchar(20)   NOT NULL,
  nik_reviewer      varchar(20),
  nik_approver      varchar(20),
  tgl_pengajuan     date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_review        timestamptz,
  tgl_approval      timestamptz,
  tgl_realisasi     timestamptz,
  catatan_reviewer  text,
  catatan_approver  text,
  fins_trans_id     bigint,
  fins_budget_id    bigint,
  period_id         bigint,
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_campaign ON disbursement_requests (campaign_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_beneficiary ON disbursement_requests (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_status ON disbursement_requests (status);
CREATE INDEX IF NOT EXISTS idx_disbursement_tgl ON disbursement_requests (tgl_pengajuan DESC);
CREATE INDEX IF NOT EXISTS idx_disbursement_fins_trans ON disbursement_requests (fins_trans_id) WHERE fins_trans_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_pengaju ON disbursement_requests (nik_pengaju);

CREATE TABLE IF NOT EXISTS qurban_animals (
  id                  bigserial     PRIMARY KEY,
  kode_hewan          varchar(20)   NOT NULL UNIQUE,
  campaign_id         bigint        NOT NULL REFERENCES campaigns (id),
  jenis_hewan         varchar(10)   NOT NULL CHECK (jenis_hewan IN ('kambing', 'sapi', 'domba', 'kerbau')),
  kapasitas_peserta   smallint      NOT NULL DEFAULT 1,
  berat_kg            numeric(6,2),
  kondisi             varchar(20)   DEFAULT 'sehat'
                        CHECK (kondisi IS NULL OR kondisi IN ('sehat', 'sakit', 'cacat', 'mati')),
  nama_peternak       varchar(200),
  kontak_peternak     varchar(20),
  alamat_peternak     text,
  lokasi_sembelih     text,
  harga_beli          bigint        NOT NULL CHECK (harga_beli > 0),
  biaya_operasional   bigint        NOT NULL DEFAULT 0,
  total_biaya         bigint        GENERATED ALWAYS AS (harga_beli + biaya_operasional) STORED,
  status              varchar(20)   NOT NULL DEFAULT 'dipesan'
                        CHECK (status IN ('dipesan', 'dibeli', 'dalam_perjalanan', 'tiba', 'disembelih', 'didistribusikan', 'batal')),
  tgl_pesan           date,
  tgl_beli            date,
  tgl_tiba            date,
  tgl_sembelih        date,
  tgl_distribusi      date,
  foto_hewan_url      text,
  foto_sembelih_url   text,
  coa_hewan           varchar(14)   DEFAULT '102.02.001.000',
  fins_trans_id_beli  bigint,
  fins_trans_id_salur bigint,
  catatan             text,
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  updated_at          timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qurban_animals_campaign ON qurban_animals (campaign_id);
CREATE INDEX IF NOT EXISTS idx_qurban_animals_status ON qurban_animals (status);
CREATE INDEX IF NOT EXISTS idx_qurban_animals_tgl_sembelih ON qurban_animals (tgl_sembelih DESC) WHERE tgl_sembelih IS NOT NULL;

CREATE TABLE IF NOT EXISTS qurban_shahibul (
  id                  bigserial     PRIMARY KEY,
  qurban_animal_id    bigint        NOT NULL REFERENCES qurban_animals (id),
  invoice_id          bigint,
  invoice_created_at  timestamptz,
  urutan_peserta      smallint      NOT NULL DEFAULT 1,
  nama_shohibul       varchar(200)  NOT NULL,
  atas_nama           varchar(200),
  kontak_shohibul     varchar(20),
  niat                varchar(300),
  sertifikat_url      text,
  sertifikat_sent_at  timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (qurban_animal_id, urutan_peserta)
);

CREATE INDEX IF NOT EXISTS idx_shahibul_animal ON qurban_shahibul (qurban_animal_id);
CREATE INDEX IF NOT EXISTS idx_shahibul_invoice ON qurban_shahibul (invoice_id, invoice_created_at) WHERE invoice_id IS NOT NULL;
