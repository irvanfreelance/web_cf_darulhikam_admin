-- ============================================================================
-- 18_fins_ca_pengajuan.sql
-- Master data + line-level table backing FINS > Home > Pengajuan CA (Cash
-- Advance request). Added because the existing `cash_advances` table (file
-- 09_ngo_expense.sql) models one aggregate row per CA with active/settled
-- status, while the actual Pengajuan CA screen is a header (id_buku) with
-- multiple independently approve/reject/unapprove-able detail lines. Also
-- adds office/department/level-approve/sumber-dana masters, none of which
-- exist as standalone tables in the base schema (only bare int columns).
-- Run after 01-16. Safe to re-run: uses IF NOT EXISTS / ON CONFLICT.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fins_kantor (
  id    int          PRIMARY KEY,
  nama  varchar(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS fins_jabatan (
  id    int          PRIMARY KEY,
  nama  varchar(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS fins_level_approve (
  id          bigserial    PRIMARY KEY,
  jabatan     varchar(150) NOT NULL UNIQUE,
  expend_min  numeric(20,2) NOT NULL DEFAULT 0,
  expend_max  numeric(20,2),
  receipt_min numeric(20,2) NOT NULL DEFAULT 0,
  receipt_max numeric(20,2),
  aktif       boolean      NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS fins_sumber_dana (
  id     bigserial    PRIMARY KEY,
  nama   varchar(150) NOT NULL,
  active boolean      NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS fins_jenis_transaksi_ca (
  coa  varchar(14)  PRIMARY KEY,
  nama varchar(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS fins_ca_pengajuan (
  id             bigserial     PRIMARY KEY,
  id_buku        varchar(30)   NOT NULL,
  tanggal        date          NOT NULL,
  coa_debet      varchar(14)   NOT NULL,
  coa_kredit     varchar(14)   NOT NULL,
  nama_akun      varchar(200)  NOT NULL,
  keterangan     text          NOT NULL DEFAULT '',
  quantity       int           NOT NULL DEFAULT 1,
  nominal        numeric(20,2) NOT NULL CHECK (nominal > 0),
  realisasi      numeric(20,2) NOT NULL DEFAULT 0,
  user_input     varchar(150)  NOT NULL DEFAULT '',
  user_approve   varchar(150)  NOT NULL DEFAULT '',
  status         varchar(15)   NOT NULL DEFAULT 'unapprove'
                   CHECK (status IN ('unapprove','approved','rejected')),
  office_id      int           NOT NULL REFERENCES fins_kantor(id),
  sumber_dana    varchar(150)  NOT NULL DEFAULT '',
  department_id  int           REFERENCES fins_jabatan(id),
  created_at     timestamptz   NOT NULL DEFAULT NOW(),
  updated_at     timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_pengajuan_id_buku ON fins_ca_pengajuan (id_buku);
CREATE INDEX IF NOT EXISTS idx_ca_pengajuan_status  ON fins_ca_pengajuan (status);
CREATE INDEX IF NOT EXISTS idx_ca_pengajuan_tanggal ON fins_ca_pengajuan (tanggal);

-- --- Seed: Kantor (offices) ---
INSERT INTO fins_kantor (id, nama) VALUES
  (1, 'Kantor Pusat'),
  (2, 'Kantor Cabang Bandung'),
  (3, 'Kantor Cabang Surabaya'),
  (4, 'Kantor Cabang Medan')
ON CONFLICT (id) DO NOTHING;

-- --- Seed: Jabatan (positions/departments) ---
INSERT INTO fins_jabatan (id, nama) VALUES
  (1, 'Staff Keuangan'),
  (2, 'Kepala Divisi'),
  (3, 'Manager Keuangan'),
  (4, 'Direktur'),
  (5, 'Superadmin')
ON CONFLICT (id) DO NOTHING;

-- --- Seed: Level Approve ---
INSERT INTO fins_level_approve (jabatan, expend_min, expend_max, receipt_min, receipt_max, aktif)
SELECT * FROM (VALUES
  ('Staff Keuangan',      0::numeric,          1000000::numeric,   0::numeric,          5000000::numeric,   true),
  ('Kepala Divisi',       1000001::numeric,    10000000::numeric,  5000001::numeric,    50000000::numeric,  true),
  ('Manager Keuangan',    10000001::numeric,   50000000::numeric,  50000001::numeric,   200000000::numeric, true),
  ('Direktur',            50000001::numeric,   NULL::numeric,      200000001::numeric,  NULL::numeric,      true)
) AS v(jabatan, expend_min, expend_max, receipt_min, receipt_max, aktif)
WHERE NOT EXISTS (SELECT 1 FROM fins_level_approve WHERE fins_level_approve.jabatan = v.jabatan);

-- --- Seed: Sumber Dana ---
INSERT INTO fins_sumber_dana (nama, active)
SELECT * FROM (VALUES
  ('Zakat', true),
  ('Infak / Sedekah', true),
  ('Wakaf', true),
  ('Dana Amil', true),
  ('CSR Perusahaan', false)
) AS v(nama, active)
WHERE NOT EXISTS (SELECT 1 FROM fins_sumber_dana WHERE fins_sumber_dana.nama = v.nama);

-- --- Seed: Jenis Transaksi CA ---
INSERT INTO fins_jenis_transaksi_ca (coa, nama) VALUES
  ('101.10.000.000', 'Uang Muka Kegiatan Program'),
  ('101.10.001.000', 'Uang Muka Perjalanan Dinas'),
  ('101.10.002.000', 'Uang Muka Operasional Kantor'),
  ('101.10.003.000', 'Uang Muka Pembelian Logistik')
ON CONFLICT (coa) DO NOTHING;

-- --- Seed: Pengajuan CA sample rows (mirrors prototype's INITIAL_PENGAJUAN_CA) ---
INSERT INTO fins_ca_pengajuan
  (id_buku, tanggal, coa_debet, coa_kredit, nama_akun, keterangan, quantity, nominal, realisasi, user_input, user_approve, status, office_id, sumber_dana, department_id)
SELECT * FROM (VALUES
  ('CA002608010010001', '2026-08-01'::date, '101.10.001.000', '101.01.001.000', 'Uang Muka Perjalanan Dinas', 'Survey lokasi bencana banjir Cianjur', 1, 3000000::numeric, 3000000::numeric, 'Ahmad Faisal', 'Irfan Abdurrahman', 'approved', 1, 'Infak / Sedekah', 2),
  ('CA002608050020001', '2026-08-05'::date, '101.10.003.000', '101.02.002.005', 'Uang Muka Pembelian Logistik', 'Pembelian sembako paket Ramadhan tahap 2', 1, 12000000::numeric, 0::numeric, 'Auliya Putri', 'Desy Bunga Sari', 'approved', 1, 'Zakat', 1),
  ('CA002608070030001', '2026-08-07'::date, '101.10.000.000', '101.01.001.000', 'Uang Muka Kegiatan Program', 'Operasional Majelis Talim Jatinangor Agustus', 1, 1500000::numeric, 750000::numeric, 'Auliya Putri', 'Irfan Abdurrahman', 'approved', 1, 'Infak / Sedekah', 1),
  ('CA002608080040001', '2026-08-08'::date, '101.10.002.000', '101.01.001.000', 'Uang Muka Operasional Kantor', 'Pembelian ATK tambahan kantor cabang', 1, 800000::numeric, 0::numeric, 'Aulia Anugraha', 'Desy Bunga Sari', 'rejected', 2, 'Infak / Sedekah', 1),
  ('CA002608090050001', '2026-08-09'::date, '101.10.001.000', '101.01.001.000', 'Uang Muka Perjalanan Dinas', 'Kunjungan mustahik penerima beasiswa Bandung', 1, 950000::numeric, 0::numeric, 'Asep Saepul', '', 'unapprove', 1, 'Zakat', 2),
  ('CA002608090060001', '2026-08-09'::date, '101.10.000.000', '101.01.001.000', 'Uang Muka Kegiatan Program', 'Penyuluhan kesehatan warga Desa Suka Maju', 1, 2200000::numeric, 0::numeric, 'Asep Saepul', '', 'unapprove', 1, 'Zakat', 2)
) AS v(id_buku, tanggal, coa_debet, coa_kredit, nama_akun, keterangan, quantity, nominal, realisasi, user_input, user_approve, status, office_id, sumber_dana, department_id)
WHERE NOT EXISTS (SELECT 1 FROM fins_ca_pengajuan WHERE fins_ca_pengajuan.id_buku = v.id_buku);
