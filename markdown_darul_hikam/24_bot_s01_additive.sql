-- ============================================================================
-- 24_bot_s01_additive.sql
-- BOT-S01 — migrasi aditif Phase 1 (Penyaluran, CRM, master program FINS).
--
-- Hanya CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
-- dan CREATE INDEX IF NOT EXISTS. Aman dijalankan ulang.
--
-- Jangan menjalankan markdown_darul_hikam/07 sampai 16 apa adanya.
-- Definisi beneficiaries di bawah menyalin kolom file 07, lalu menambah
-- kolom geo dan verifikasi kelayakan.
--
-- Cek sebelum menulis berkas ini (hanya naskah di repo, database tidak dibuka):
--   donors            : id, name, email, phone, is_anonymous_default, created_at
--   invoices          : berpartisi created_at; fins_trans_id sudah di file 02
--   fins_ca_pengajuan : file 18 + kolom pencairan file 19 (approve, no_resi, ...)
--   beneficiaries     : belum ada berkas aditif; file 07 tidak boleh dijalankan
--   fins_program, disbursement_lpj, crm_teams, donor_merge_log, donor_routines
--                     : belum ada
-- Tabel *_bak dan _test_* tidak disentuh.
-- Tidak ada FK ke invoice. Referensi kampanye tidak memakai aksi cascade.
-- ============================================================================

-- --- Master program FINS (terpisah dari campaigns crowdfunding) ---
CREATE TABLE IF NOT EXISTS fins_program (
  id          bigserial     PRIMARY KEY,
  kode        varchar(30)   NOT NULL,
  nama        varchar(200)  NOT NULL,
  dp_percent  numeric(6,2)  CHECK (dp_percent IS NULL OR (dp_percent >= 0 AND dp_percent <= 100)),
  aktif       boolean       NOT NULL DEFAULT true,
  campaign_id bigint,
  created_at  timestamptz   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fins_program_kode ON fins_program (kode);
CREATE INDEX IF NOT EXISTS idx_fins_program_campaign ON fins_program (campaign_id) WHERE campaign_id IS NOT NULL;

-- --- LPJ penyaluran (narasi), terpisah dari LPJ cash advance ---
CREATE TABLE IF NOT EXISTS disbursement_lpj (
  id                bigserial     PRIMARY KEY,
  request_id        bigint,
  judul             varchar(300),
  tgl_kegiatan      date,
  jumlah_realisasi  bigint,
  narasi            text,
  disusun_oleh      varchar(150),
  status            varchar(20)   DEFAULT 'draft',
  reviewer          varchar(150),
  catatan_review    text,
  created_at        timestamptz   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_lpj_request ON disbursement_lpj (request_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_lpj_status ON disbursement_lpj (status);

-- --- Tim CRM ---
CREATE TABLE IF NOT EXISTS crm_teams (
  id     bigserial    PRIMARY KEY,
  nama   varchar(150) NOT NULL,
  aktif  boolean      DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_crm_teams_aktif ON crm_teams (aktif);

-- --- Jejak penggabungan donatur. Tidak menghapus baris donors. ---
CREATE TABLE IF NOT EXISTS donor_merge_log (
  id           bigserial     PRIMARY KEY,
  survivor_id  bigint        NOT NULL REFERENCES donors (id),
  merged_id    bigint        NOT NULL REFERENCES donors (id),
  merged_at    timestamptz   DEFAULT NOW(),
  actor        varchar(150)
);

CREATE INDEX IF NOT EXISTS idx_donor_merge_log_survivor ON donor_merge_log (survivor_id);
CREATE INDEX IF NOT EXISTS idx_donor_merge_log_merged ON donor_merge_log (merged_id);

-- --- Komitmen donasi rutin ---
CREATE TABLE IF NOT EXISTS donor_routines (
  id         bigserial    PRIMARY KEY,
  donor_id   bigint       REFERENCES donors (id),
  nominal    bigint,
  cadence    varchar(10),
  aktif      boolean      DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_donor_routines_donor ON donor_routines (donor_id);

-- --- Kolom CRM pada donors. Nullable atau ber-default agar baris lama tetap valid. ---
ALTER TABLE donors ADD COLUMN IF NOT EXISTS jenis varchar(20) NOT NULL DEFAULT 'perorangan';
ALTER TABLE donors ADD COLUMN IF NOT EXISTS jenis_kelamin varchar(1) CHECK (jenis_kelamin IS NULL OR jenis_kelamin IN ('L', 'P'));
ALTER TABLE donors ADD COLUMN IF NOT EXISTS alamat text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS nik varchar(16);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS status_aktif boolean NOT NULL DEFAULT true;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kantor_id int;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS tim_crm_id bigint REFERENCES crm_teams (id);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS minat_program text;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS merged_into_id bigint REFERENCES donors (id);

CREATE INDEX IF NOT EXISTS idx_donors_jenis ON donors (jenis);
CREATE INDEX IF NOT EXISTS idx_donors_status_aktif ON donors (status_aktif);
CREATE UNIQUE INDEX IF NOT EXISTS uq_donors_nik ON donors (nik) WHERE nik IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donors_kantor ON donors (kantor_id) WHERE kantor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donors_tim_crm ON donors (tim_crm_id) WHERE tim_crm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donors_merged_into ON donors (merged_into_id) WHERE merged_into_id IS NOT NULL;

-- --- Penerima manfaat. CREATE bila belum ada; ALTER bila file 07 sudah terpasang. ---
CREATE TABLE IF NOT EXISTS beneficiaries (
  id                       bigserial     PRIMARY KEY,
  kode_beneficiary         varchar(20)   NOT NULL UNIQUE,
  nama_lengkap             varchar(200)  NOT NULL,
  nik                      varchar(16)   UNIQUE,
  nomor_kk                 varchar(16),
  tempat_lahir             varchar(100),
  tgl_lahir                date,
  jenis_kelamin            varchar(1)    CHECK (jenis_kelamin IS NULL OR jenis_kelamin IN ('L', 'P')),
  alamat                   text,
  rt                       varchar(4),
  rw                       varchar(4),
  kelurahan                varchar(100),
  kecamatan                varchar(100),
  kabupaten                varchar(100),
  provinsi                 varchar(100),
  kontak                   varchar(20),
  handphone                varchar(20),
  email                    varchar(150),
  kategori                 varchar(20)   NOT NULL DEFAULT 'individu'
                             CHECK (kategori IN ('individu', 'keluarga', 'komunitas', 'lembaga')),
  status_ekonomi           varchar(20)   DEFAULT 'miskin'
                             CHECK (status_ekonomi IS NULL OR status_ekonomi IN ('sangat_miskin', 'miskin', 'hampir_miskin', 'lainnya')),
  jumlah_anggota_keluarga  smallint,
  asnaf                    varchar(30),
  latitude                 numeric(10,7),
  longitude                numeric(10,7),
  foto_ktp_url             text,
  foto_kk_url              text,
  foto_rumah_url           text,
  status_verifikasi        varchar(15)   NOT NULL DEFAULT 'unverified'
                             CHECK (status_verifikasi IN ('unverified', 'verified', 'rejected')),
  verified_by              varchar(20),
  verified_at              timestamptz,
  catatan_verifikasi       text,
  verifikasi_tempat_tinggal text,
  verifikasi_penghasilan   numeric(20,2),
  verifikasi_tanggungan    smallint,
  verifikasi_aset          text,
  verifikasi_dokumen       text,
  verifikasi_keputusan     varchar(30),
  campaign_id              bigint        REFERENCES campaigns (id),
  created_at               timestamptz   NOT NULL DEFAULT NOW(),
  updated_at               timestamptz   NOT NULL DEFAULT NOW(),
  deleted_at               timestamptz
);

ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS asnaf varchar(30);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS handphone varchar(20);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS email varchar(150);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_tempat_tinggal text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_penghasilan numeric(20,2);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_tanggungan smallint;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_aset text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_dokumen text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS verifikasi_keputusan varchar(30);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_nik ON beneficiaries (nik) WHERE nik IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_campaign ON beneficiaries (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries (status_verifikasi);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_kabupaten ON beneficiaries (kabupaten) WHERE kabupaten IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_deleted ON beneficiaries (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_geo ON beneficiaries (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiaries_asnaf ON beneficiaries (asnaf) WHERE asnaf IS NOT NULL;

-- --- Kolom LPJ pada pengajuan CA. Nullable, tidak mengubah kode approve. ---
ALTER TABLE fins_ca_pengajuan ADD COLUMN IF NOT EXISTS pengembali varchar(150);
ALTER TABLE fins_ca_pengajuan ADD COLUMN IF NOT EXISTS tgl_lpj date;
ALTER TABLE fins_ca_pengajuan ADD COLUMN IF NOT EXISTS nominal_lpj numeric(20,2);
ALTER TABLE fins_ca_pengajuan ADD COLUMN IF NOT EXISTS selisih numeric(20,2);

CREATE INDEX IF NOT EXISTS idx_ca_pengajuan_tgl_lpj ON fins_ca_pengajuan (tgl_lpj) WHERE tgl_lpj IS NOT NULL;

-- --- Penanda sinkron FINS pada invoice. fins_trans_id sudah didefinisikan di file 02. ---
-- Induk partisi: kolom baru mengikuti seluruh partisi.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fins_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoices_fins_synced_at ON invoices (fins_synced_at) WHERE fins_synced_at IS NOT NULL;
