-- ============================================================
-- NGO Penggajian (Payroll) & Perpajakan Karyawan
-- Tabel: employees, payroll_periods, payroll_items,
--        tax_withholding (Bukti Potong PPh 21)
-- ============================================================

-- ============================================================
-- TABLE 1: employees — Master Karyawan
-- ============================================================
DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
  id                bigserial     PRIMARY KEY,
  nik               varchar(20)   NOT NULL UNIQUE,
  nama              varchar(200)  NOT NULL,
  nik_ktp           varchar(16)   UNIQUE,
  npwp              varchar(20)   UNIQUE,
  status_ptkp       varchar(10)   NOT NULL DEFAULT 'TK0'
                      CHECK (status_ptkp IN ('TK0','TK1','TK2','TK3','K0','K1','K2','K3','KI0','KI1','KI2','KI3')),
  jabatan           varchar(100),
  departemen        varchar(100),
  tgl_masuk         date          NOT NULL,
  tgl_keluar        date,
  status_kerja      varchar(15)   NOT NULL DEFAULT 'aktif'
                      CHECK (status_kerja IN ('aktif','cuti','nonaktif','resigned','terminated')),
  jenis_karyawan    varchar(15)   NOT NULL DEFAULT 'tetap'
                      CHECK (jenis_karyawan IN ('tetap','kontrak','freelance','magang')),
  gaji_pokok        bigint        NOT NULL CHECK (gaji_pokok >= 0),
  tunjangan_tetap   bigint        NOT NULL DEFAULT 0,
  tunjangan_makan   bigint        NOT NULL DEFAULT 0,
  tunjangan_transport bigint      NOT NULL DEFAULT 0,
  rekening_bank     varchar(50),
  id_bank_gaji      varchar(5)    REFERENCES fins_bank(id_bank) ON DELETE SET NULL,
  email             varchar(150),
  telepon           varchar(20),
  id_kantor         int           NOT NULL DEFAULT 1,
  coa_gaji          varchar(14)   NOT NULL DEFAULT '502.04.001.000',
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW(),
  deleted_at        timestamptz
);

COMMENT ON TABLE  employees IS 'Master data karyawan/staf yayasan';
COMMENT ON COLUMN employees.status_ptkp IS 'Status PTKP untuk perhitungan PPh 21: TK0=Tidak Kawin, K0=Kawin, KI=Kawin+Istri bekerja';
COMMENT ON COLUMN employees.nik IS 'Nomor induk karyawan internal';

CREATE INDEX idx_employees_status   ON employees (status_kerja) WHERE status_kerja = 'aktif';
CREATE INDEX idx_employees_dept     ON employees (departemen)   WHERE departemen IS NOT NULL;
CREATE INDEX idx_employees_deleted  ON employees (deleted_at)   WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 2: payroll_periods — Periode Penggajian Bulanan
-- ============================================================
DROP TABLE IF EXISTS payroll_periods CASCADE;
CREATE TABLE payroll_periods (
  id                    bigserial     PRIMARY KEY,
  periode_bulan         smallint      NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun         smallint      NOT NULL,
  nama_periode          varchar(50),
  tgl_gajian            date,
  total_gaji_bruto      bigint        NOT NULL DEFAULT 0,
  total_tunjangan       bigint        NOT NULL DEFAULT 0,
  total_pph21           bigint        NOT NULL DEFAULT 0,
  total_potongan_lain   bigint        NOT NULL DEFAULT 0,
  total_gaji_bersih     bigint        NOT NULL DEFAULT 0,
  jumlah_karyawan       int           NOT NULL DEFAULT 0,
  status                varchar(15)   NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','calculated','approved','paid','finalized')),
  nik_approver          varchar(20),
  approved_at           timestamptz,
  fins_trans_id_gaji    bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_pph     bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  period_id             bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (periode_bulan, periode_tahun)
);

COMMENT ON COLUMN payroll_periods.fins_trans_id_gaji IS 'Debet 502.04, Kredit 201.05 (hutang gaji)';
COMMENT ON COLUMN payroll_periods.fins_trans_id_pph  IS 'Debet 502.05/201.04 (pph21), Kredit 201.04';

CREATE INDEX idx_payroll_period_status ON payroll_periods (status);
CREATE INDEX idx_payroll_period_tahun  ON payroll_periods (periode_tahun DESC, periode_bulan DESC);

-- ============================================================
-- TABLE 3: payroll_items — Slip Gaji per Karyawan
-- ============================================================
DROP TABLE IF EXISTS payroll_items CASCADE;
CREATE TABLE payroll_items (
  id                  bigserial     PRIMARY KEY,
  payroll_period_id   bigint        NOT NULL
    REFERENCES payroll_periods(id) ON DELETE RESTRICT,
  employee_id         bigint        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  nik                 varchar(20)   NOT NULL,
  nama                varchar(200)  NOT NULL,
  status_ptkp         varchar(10)   NOT NULL,
  gaji_pokok          bigint        NOT NULL DEFAULT 0,
  tunjangan_tetap     bigint        NOT NULL DEFAULT 0,
  tunjangan_makan     bigint        NOT NULL DEFAULT 0,
  tunjangan_transport bigint        NOT NULL DEFAULT 0,
  tunjangan_lain      bigint        NOT NULL DEFAULT 0,
  bonus               bigint        NOT NULL DEFAULT 0,
  thr                 bigint        NOT NULL DEFAULT 0,
  total_penghasilan   bigint        GENERATED ALWAYS AS (
    gaji_pokok + tunjangan_tetap + tunjangan_makan + tunjangan_transport
    + tunjangan_lain + bonus + thr
  ) STORED,
  ptkp_tahunan        bigint        NOT NULL DEFAULT 0,
  pkp_tahunan         bigint        NOT NULL DEFAULT 0,
  pph21_tahunan       bigint        NOT NULL DEFAULT 0,
  pph21_bulanan       bigint        NOT NULL DEFAULT 0,
  potongan_bpjs_tk    bigint        NOT NULL DEFAULT 0,
  potongan_bpjs_kes   bigint        NOT NULL DEFAULT 0,
  potongan_kasbon     bigint        NOT NULL DEFAULT 0,
  total_potongan      bigint        GENERATED ALWAYS AS (
    pph21_bulanan + potongan_bpjs_tk + potongan_bpjs_kes + potongan_kasbon
  ) STORED,
  gaji_bersih         bigint        GENERATED ALWAYS AS (
    gaji_pokok + tunjangan_tetap + tunjangan_makan + tunjangan_transport
    + tunjangan_lain + bonus + thr
    - pph21_bulanan - potongan_bpjs_tk - potongan_bpjs_kes - potongan_kasbon
  ) STORED,
  rekening_tujuan     varchar(50),
  id_bank_gaji        varchar(5),
  fins_trans_id       bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  slip_gaji_url       text,
  created_at          timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payroll_items IS 'Slip gaji per karyawan per periode penggajian';

CREATE INDEX idx_payroll_items_period ON payroll_items (payroll_period_id);
CREATE INDEX idx_payroll_items_emp    ON payroll_items (employee_id);
CREATE UNIQUE INDEX idx_payroll_items_unique ON payroll_items (payroll_period_id, employee_id);

-- ============================================================
-- TABLE 4: tax_withholding — Bukti Potong PPh 21 Tahunan
-- ============================================================
DROP TABLE IF EXISTS tax_withholding CASCADE;
CREATE TABLE tax_withholding (
  id                    bigserial     PRIMARY KEY,
  nomor_bukpot          varchar(50)   NOT NULL UNIQUE,
  employee_id           bigint        NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  nik                   varchar(20)   NOT NULL,
  nama                  varchar(200)  NOT NULL,
  npwp                  varchar(20),
  tahun_pajak           smallint      NOT NULL,
  total_penghasilan     bigint        NOT NULL CHECK (total_penghasilan > 0),
  total_ptkp            bigint        NOT NULL,
  total_pkp             bigint        NOT NULL,
  total_pph21           bigint        NOT NULL CHECK (total_pph21 >= 0),
  pph21_dipotong        bigint        NOT NULL DEFAULT 0,
  pph21_kurang_bayar    bigint        GENERATED ALWAYS AS (total_pph21 - pph21_dipotong) STORED,
  pdf_url               text,
  issued_by             varchar(20)   NOT NULL,
  issued_at             timestamptz   NOT NULL DEFAULT NOW(),
  sent_at               timestamptz,
  UNIQUE (employee_id, tahun_pajak)
);

COMMENT ON TABLE tax_withholding IS 'Bukti potong PPh 21 tahunan per karyawan (Form 1721-A1)';

CREATE INDEX idx_bukpot_employee ON tax_withholding (employee_id);
CREATE INDEX idx_bukpot_tahun    ON tax_withholding (tahun_pajak DESC);
CREATE INDEX idx_bukpot_sent     ON tax_withholding (sent_at) WHERE sent_at IS NULL;
