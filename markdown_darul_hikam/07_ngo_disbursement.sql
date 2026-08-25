-- ============================================================
-- NGO Penyaluran Dana Program
-- Tabel: beneficiaries, disbursement_requests, _items,
--        _proofs, _recipients
-- Semua FK ke fins_trans, campaigns, fins_coa
-- ============================================================

-- ============================================================
-- TABLE 1: beneficiaries — Master Penerima Manfaat
-- ============================================================
DROP TABLE IF EXISTS beneficiaries CASCADE;
CREATE TABLE beneficiaries (
  id                  bigserial     PRIMARY KEY,
  kode_beneficiary    varchar(20)   NOT NULL UNIQUE,
  nama_lengkap        varchar(200)  NOT NULL,
  nik                 varchar(16)   UNIQUE,
  nomor_kk            varchar(16),
  tempat_lahir        varchar(100),
  tgl_lahir           date,
  jenis_kelamin       varchar(1)    CHECK (jenis_kelamin IN ('L','P')),
  alamat              text,
  rt                  varchar(4),
  rw                  varchar(4),
  kelurahan           varchar(100),
  kecamatan           varchar(100),
  kabupaten           varchar(100),
  provinsi            varchar(100),
  kontak              varchar(20),
  kategori            varchar(20)   NOT NULL DEFAULT 'individu'
                        CHECK (kategori IN ('individu','keluarga','komunitas','lembaga')),
  status_ekonomi      varchar(20)   DEFAULT 'miskin'
                        CHECK (status_ekonomi IN ('sangat_miskin','miskin','hampir_miskin','lainnya')),
  jumlah_anggota_keluarga smallint,
  foto_ktp_url        text,
  foto_kk_url         text,
  foto_rumah_url      text,
  status_verifikasi   varchar(15)   NOT NULL DEFAULT 'unverified'
                        CHECK (status_verifikasi IN ('unverified','verified','rejected')),
  verified_by         varchar(20),
  verified_at         timestamptz,
  catatan_verifikasi  text,
  campaign_id         bigint        REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  updated_at          timestamptz   NOT NULL DEFAULT NOW(),
  deleted_at          timestamptz
);

COMMENT ON TABLE  beneficiaries IS 'Master data penerima manfaat program NGO';
COMMENT ON COLUMN beneficiaries.kode_beneficiary IS 'Format: BNF-YYYY-XXXXXX';
COMMENT ON COLUMN beneficiaries.status_verifikasi IS 'unverified=baru input, verified=sudah dicek lapangan, rejected=tidak memenuhi syarat';

CREATE INDEX idx_beneficiaries_nik        ON beneficiaries (nik)         WHERE nik IS NOT NULL;
CREATE INDEX idx_beneficiaries_campaign   ON beneficiaries (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_beneficiaries_status     ON beneficiaries (status_verifikasi);
CREATE INDEX idx_beneficiaries_kabupaten  ON beneficiaries (kabupaten)   WHERE kabupaten IS NOT NULL;
CREATE INDEX idx_beneficiaries_deleted    ON beneficiaries (deleted_at)  WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 2: disbursement_requests — Pengajuan Penyaluran Dana
-- ============================================================
DROP TABLE IF EXISTS disbursement_requests CASCADE;
CREATE TABLE disbursement_requests (
  id                  bigserial     PRIMARY KEY,
  nomor_pengajuan     varchar(30)   NOT NULL UNIQUE,
  campaign_id         bigint        NOT NULL REFERENCES campaigns(id)    ON DELETE RESTRICT,
  beneficiary_id      bigint        REFERENCES beneficiaries(id)         ON DELETE SET NULL,
  judul               varchar(300)  NOT NULL,
  deskripsi           text,
  jenis_penyaluran    varchar(20)   NOT NULL
                        CHECK (jenis_penyaluran IN ('transfer','tunai','barang','jasa','campuran')),
  jumlah_diajukan     bigint        NOT NULL CHECK (jumlah_diajukan > 0),
  jumlah_disetujui    bigint        CHECK (jumlah_disetujui >= 0),
  coa_debet           varchar(14)   NOT NULL,   -- COA penyaluran (501.xx)
  coa_kredit          varchar(14)   NOT NULL,   -- COA bank pembayar (101.02.xxx)
  status              varchar(15)   NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','reviewed','approved','disbursed','cancelled','rejected')),
  nik_pengaju         varchar(20)   NOT NULL,
  nik_reviewer        varchar(20),
  nik_approver        varchar(20),
  tgl_pengajuan       date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_review          timestamptz,
  tgl_approval        timestamptz,
  tgl_realisasi       timestamptz,
  catatan_reviewer    text,
  catatan_approver    text,
  fins_trans_id       bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_budget_id      bigint        REFERENCES fins_budget(id) ON DELETE SET NULL,
  period_id           bigint,       -- FK ke accounting_periods (ditambah file 10)
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  updated_at          timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  disbursement_requests IS 'Pengajuan penyaluran dana program ke penerima manfaat';
COMMENT ON COLUMN disbursement_requests.nomor_pengajuan IS 'Format: DSB-YYYY-XXXXXX, generated saat submit';
COMMENT ON COLUMN disbursement_requests.status          IS 'Workflow: draft→submitted→reviewed→approved→disbursed';
COMMENT ON COLUMN disbursement_requests.fins_trans_id   IS 'Diisi saat status=disbursed, buat fins_trans jenis=e';

CREATE INDEX idx_disbursement_campaign   ON disbursement_requests (campaign_id);
CREATE INDEX idx_disbursement_beneficiary ON disbursement_requests (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX idx_disbursement_status     ON disbursement_requests (status);
CREATE INDEX idx_disbursement_tgl        ON disbursement_requests (tgl_pengajuan DESC);
CREATE INDEX idx_disbursement_fins_trans ON disbursement_requests (fins_trans_id) WHERE fins_trans_id IS NOT NULL;
CREATE INDEX idx_disbursement_pengaju    ON disbursement_requests (nik_pengaju);

-- ============================================================
-- TABLE 3: disbursement_items — Rincian Item Penyaluran
-- ============================================================
DROP TABLE IF EXISTS disbursement_items CASCADE;
CREATE TABLE disbursement_items (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL
    REFERENCES disbursement_requests(id) ON DELETE CASCADE,
  keterangan              varchar(300)  NOT NULL,
  qty                     numeric(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  satuan                  varchar(30),
  harga_satuan            bigint        NOT NULL CHECK (harga_satuan >= 0),
  subtotal                bigint        GENERATED ALWAYS AS
    (ROUND(qty * harga_satuan)::bigint) STORED,
  coa                     varchar(14)   NOT NULL,   -- spesifik COA pengeluaran item ini
  keterangan_coa          varchar(100),
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE disbursement_items IS 'Rincian item dalam satu pengajuan penyaluran';
COMMENT ON COLUMN disbursement_items.subtotal IS 'Generated: qty × harga_satuan (otomatis)';

CREATE INDEX idx_disbursement_items_req ON disbursement_items (disbursement_request_id);
CREATE INDEX idx_disbursement_items_coa ON disbursement_items (coa);

-- ============================================================
-- TABLE 4: disbursement_proofs — Bukti Realisasi Penyaluran
-- ============================================================
DROP TABLE IF EXISTS disbursement_proofs CASCADE;
CREATE TABLE disbursement_proofs (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL
    REFERENCES disbursement_requests(id) ON DELETE CASCADE,
  jenis_dokumen           varchar(20)   NOT NULL
    CHECK (jenis_dokumen IN ('foto','video','tanda_terima','berita_acara','kwitansi','lainnya')),
  file_url                text          NOT NULL,
  caption                 varchar(300),
  uploaded_by             varchar(20)   NOT NULL,
  uploaded_at             timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE disbursement_proofs IS 'Dokumen bukti penyaluran sudah terealisasi (foto, tanda terima, BA)';

CREATE INDEX idx_disbursement_proofs_req ON disbursement_proofs (disbursement_request_id);

-- ============================================================
-- TABLE 5: disbursement_recipients — Penerima Massal
-- Untuk penyaluran ke banyak penerima: pangan, berbuka, dll
-- ============================================================
DROP TABLE IF EXISTS disbursement_recipients CASCADE;
CREATE TABLE disbursement_recipients (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL
    REFERENCES disbursement_requests(id) ON DELETE CASCADE,
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

COMMENT ON TABLE disbursement_recipients IS 'Daftar penerima per penyaluran massal';

CREATE INDEX idx_disb_recipients_req         ON disbursement_recipients (disbursement_request_id);
CREATE INDEX idx_disb_recipients_beneficiary ON disbursement_recipients (beneficiary_id) WHERE beneficiary_id IS NOT NULL;
CREATE INDEX idx_disb_recipients_tgl         ON disbursement_recipients (tgl_terima DESC);
