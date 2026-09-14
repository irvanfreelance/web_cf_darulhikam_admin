-- ============================================================
-- NGO Grant Management & Sertifikat Donasi
-- Tabel: grants, grant_disbursements, donation_certificates
-- ============================================================

-- ============================================================
-- TABLE 1: grants — Master Hibah / Grant
-- ============================================================
DROP TABLE IF EXISTS grants CASCADE;
CREATE TABLE grants (
  id                    bigserial     PRIMARY KEY,
  nomor_grant           varchar(50)   NOT NULL UNIQUE,
  nama_pemberi          varchar(300)  NOT NULL,
  jenis_pemberi         varchar(20)   NOT NULL DEFAULT 'lembaga'
                          CHECK (jenis_pemberi IN ('baznas','pemerintah','lembaga_asing','perusahaan','individu')),
  judul_grant           varchar(300)  NOT NULL,
  deskripsi             text,
  tujuan_spesifik       text,         -- pembatasan penggunaan dana
  jenis_dana            varchar(20)   NOT NULL DEFAULT 'terikat_sementara'
                          CHECK (jenis_dana IN ('tidak_terikat','terikat_sementara','terikat_permanen')),
  total_grant           bigint        NOT NULL CHECK (total_grant > 0),
  total_cair            bigint        NOT NULL DEFAULT 0,
  total_digunakan       bigint        NOT NULL DEFAULT 0,
  sisa_grant            bigint        GENERATED ALWAYS AS (total_cair - total_digunakan) STORED,
  mata_uang             varchar(5)    NOT NULL DEFAULT 'IDR',
  kurs_idr              numeric(15,4) NOT NULL DEFAULT 1,
  coa_grant             varchar(14)   NOT NULL DEFAULT '401.09.001.000',
  coa_receivable        varchar(14)   NOT NULL DEFAULT '101.04.003.000',
  periode_mulai         date          NOT NULL,
  periode_selesai       date          NOT NULL,
  syarat_pelaporan      text,
  frekuensi_laporan     varchar(15)   DEFAULT 'bulanan'
                          CHECK (frekuensi_laporan IN ('bulanan','triwulan','semesteran','tahunan','selesai')),
  status                varchar(15)   NOT NULL DEFAULT 'active'
                          CHECK (status IN ('proposed','approved','active','completed','terminated','rejected')),
  dokumen_mou_url       text,
  nik_pic               varchar(20),
  tgl_penandatanganan   date,
  fins_trans_id         bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  receivable_id         bigint        REFERENCES receivables(id) ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  grants IS 'Master hibah/grant dari lembaga eksternal';
COMMENT ON COLUMN grants.jenis_dana       IS 'PSAK 45: klasifikasi pembatasan dana hibah';
COMMENT ON COLUMN grants.fins_trans_id    IS 'Saat grant cair: Debet 101.02.xxx, Kredit 401.09.xxx';

CREATE INDEX idx_grants_status     ON grants (status);
CREATE INDEX idx_grants_jenis      ON grants (jenis_pemberi);
CREATE INDEX idx_grants_periode    ON grants (periode_mulai, periode_selesai);

-- ============================================================
-- TABLE 2: grant_disbursements — Pencairan Bertahap Grant
-- ============================================================
DROP TABLE IF EXISTS grant_disbursements CASCADE;
CREATE TABLE grant_disbursements (
  id                bigserial     PRIMARY KEY,
  grant_id          bigint        NOT NULL REFERENCES grants(id) ON DELETE RESTRICT,
  tahap             smallint      NOT NULL,
  judul_tahap       varchar(200),
  jumlah            bigint        NOT NULL CHECK (jumlah > 0),
  tgl_pencairan     date,
  tgl_laporan_deadline date,
  status            varchar(15)   NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','requested','received','reported','late')),
  fins_trans_id     bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  laporan_url       text,
  catatan           text,
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (grant_id, tahap)
);

COMMENT ON COLUMN grant_disbursements.fins_trans_id IS 'Pencairan: Debet 101.02.xxx, Kredit 101.04.003 (piutang grant)';

CREATE INDEX idx_grant_disb_grant  ON grant_disbursements (grant_id);
CREATE INDEX idx_grant_disb_status ON grant_disbursements (status);

-- ============================================================
-- TABLE 3: grant_reports — Laporan Pertanggungjawaban ke Pemberi
-- ============================================================
DROP TABLE IF EXISTS grant_reports CASCADE;
CREATE TABLE grant_reports (
  id                    bigserial     PRIMARY KEY,
  grant_id              bigint        NOT NULL REFERENCES grants(id) ON DELETE RESTRICT,
  grant_disbursement_id bigint        REFERENCES grant_disbursements(id) ON DELETE SET NULL,
  periode_laporan       varchar(30)   NOT NULL,
  judul_laporan         varchar(300)  NOT NULL,
  total_penggunaan      bigint        NOT NULL DEFAULT 0,
  status                varchar(15)   NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','accepted','revision','rejected')),
  laporan_pdf_url       text,
  submitted_at          timestamptz,
  accepted_at           timestamptz,
  catatan_pemberi       text,
  created_at            timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grant_report_grant  ON grant_reports (grant_id);
CREATE INDEX idx_grant_report_status ON grant_reports (status);

-- ============================================================
-- TABLE 4: donation_certificates — Sertifikat Donasi Tahunan
-- Untuk donatur yang butuh bukti donasi (zakat sebagai
-- pengurang pajak, atau laporan tahunan kepada donatur)
-- ============================================================
DROP TABLE IF EXISTS donation_certificates CASCADE;
CREATE TABLE donation_certificates (
  id                    bigserial     PRIMARY KEY,
  nomor_sertifikat      varchar(50)   NOT NULL UNIQUE,
  donor_id              bigint        REFERENCES donors(id) ON DELETE SET NULL,
  nama_donatur          varchar(200)  NOT NULL,
  email_donatur         varchar(150),
  npwp_donatur          varchar(20),
  tahun_donasi          smallint      NOT NULL,
  total_donasi          bigint        NOT NULL CHECK (total_donasi > 0),
  total_zakat           bigint        NOT NULL DEFAULT 0,
  total_infaq           bigint        NOT NULL DEFAULT 0,
  total_qurban          bigint        NOT NULL DEFAULT 0,
  total_lainnya         bigint        NOT NULL DEFAULT 0,
  jumlah_transaksi      int           NOT NULL DEFAULT 0,
  campaign_ids          bigint[],     -- array campaign yang didonasi
  pdf_url               text,
  sent_at               timestamptz,
  sent_via              varchar(10)   DEFAULT 'email'
                          CHECK (sent_via IN ('email','whatsapp','manual')),
  issued_by             varchar(20)   NOT NULL,
  issued_at             timestamptz   NOT NULL DEFAULT NOW(),
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (donor_id, tahun_donasi)
);

COMMENT ON TABLE  donation_certificates IS 'Sertifikat donasi tahunan per donatur (bisa digunakan untuk bukti potong pajak)';
COMMENT ON COLUMN donation_certificates.nomor_sertifikat IS 'Format: SERT-YYYY-XXXXXXXX';
COMMENT ON COLUMN donation_certificates.total_zakat IS 'Total donasi yang merupakan zakat (pengurang pajak PPh 29)';

CREATE INDEX idx_cert_donor  ON donation_certificates (donor_id)    WHERE donor_id IS NOT NULL;
CREATE INDEX idx_cert_tahun  ON donation_certificates (tahun_donasi DESC);
CREATE INDEX idx_cert_sent   ON donation_certificates (sent_at)     WHERE sent_at IS NULL;
