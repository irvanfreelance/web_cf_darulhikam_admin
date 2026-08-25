-- ============================================================
-- NGO Hutang, Piutang & Transfer Internal, Petty Cash
-- Tabel: payables, receivables, internal_transfers,
--        petty_cash_books, petty_cash_transactions
-- ============================================================

-- ============================================================
-- TABLE 1: payables — Hutang Usaha ke Vendor
-- ============================================================
DROP TABLE IF EXISTS payables CASCADE;
CREATE TABLE payables (
  id                    bigserial     PRIMARY KEY,
  nomor_payable         varchar(30)   NOT NULL UNIQUE,
  vendor_id             bigint        NOT NULL REFERENCES vendors(id)   ON DELETE RESTRICT,
  purchase_order_id     bigint        REFERENCES purchase_orders(id)    ON DELETE SET NULL,
  nomor_invoice_vendor  varchar(100)  NOT NULL,
  tgl_invoice_vendor    date          NOT NULL,
  due_date              date          NOT NULL,
  total_amount          bigint        NOT NULL CHECK (total_amount > 0),
  paid_amount           bigint        NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  outstanding           bigint        GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  coa_hutang            varchar(14)   NOT NULL DEFAULT '201.03.000.000',
  coa_expense           varchar(14)   NOT NULL,
  status                varchar(15)   NOT NULL DEFAULT 'unpaid'
                          CHECK (status IN ('unpaid','partial','paid','overdue','cancelled','disputed')),
  fins_trans_id_accrual bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_payment bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  period_id             bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  dokumen_url           text,
  catatan               text,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN payables.fins_trans_id_accrual IS 'Saat invoice diterima: Debet 502.xx, Kredit 201.03 (hutang usaha)';
COMMENT ON COLUMN payables.fins_trans_id_payment IS 'Saat dibayar: Debet 201.03, Kredit 101.02.xxx (bank)';

CREATE INDEX idx_payables_vendor   ON payables (vendor_id);
CREATE INDEX idx_payables_status   ON payables (status);
CREATE INDEX idx_payables_due_date ON payables (due_date) WHERE status NOT IN ('paid','cancelled');
CREATE INDEX idx_payables_period   ON payables (period_id);
-- Index untuk aging report
CREATE INDEX idx_payables_aging ON payables (due_date, outstanding)
  WHERE status IN ('unpaid','partial','overdue');

-- ============================================================
-- TABLE 2: receivables — Piutang Non-Donasi
-- (Grant yang diakui tapi belum cair, pinjaman, dll)
-- ============================================================
DROP TABLE IF EXISTS receivables CASCADE;
CREATE TABLE receivables (
  id                    bigserial     PRIMARY KEY,
  nomor_receivable      varchar(30)   NOT NULL UNIQUE,
  pihak                 varchar(200)  NOT NULL,
  jenis                 varchar(20)   NOT NULL
                          CHECK (jenis IN ('grant','pinjaman_diberikan','titipan','lainnya')),
  keterangan            varchar(300)  NOT NULL,
  tgl_pengakuan         date          NOT NULL,
  due_date              date,
  total_amount          bigint        NOT NULL CHECK (total_amount > 0),
  collected_amount      bigint        NOT NULL DEFAULT 0,
  outstanding           bigint        GENERATED ALWAYS AS (total_amount - collected_amount) STORED,
  coa_piutang           varchar(14)   NOT NULL DEFAULT '101.04.003.000',
  coa_pendapatan        varchar(14)   NOT NULL,
  status                varchar(15)   NOT NULL DEFAULT 'outstanding'
                          CHECK (status IN ('outstanding','partial','collected','written_off','cancelled')),
  fins_trans_id_accrual bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_collection bigint     REFERENCES fins_trans(id) ON DELETE SET NULL,
  grant_id              bigint,       -- FK ke grants (file 13)
  period_id             bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  dokumen_url           text,
  catatan               text,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN receivables.fins_trans_id_accrual    IS 'Pengakuan piutang: Debet 101.04.xxx, Kredit 401.09.xxx';
COMMENT ON COLUMN receivables.fins_trans_id_collection IS 'Pembayaran masuk: Debet 101.02.xxx, Kredit 101.04.xxx';

CREATE INDEX idx_receivables_jenis  ON receivables (jenis);
CREATE INDEX idx_receivables_status ON receivables (status);
CREATE INDEX idx_receivables_due    ON receivables (due_date) WHERE status IN ('outstanding','partial');

-- ============================================================
-- TABLE 3: internal_transfers — Transfer Antar Rekening Sendiri
-- Contoh: settlement Xendit cair ke Mandiri VA,
--         lalu transfer ke BCA operasional
-- ============================================================
DROP TABLE IF EXISTS internal_transfers CASCADE;
CREATE TABLE internal_transfers (
  id                    bigserial     PRIMARY KEY,
  nomor_transfer        varchar(30)   NOT NULL UNIQUE,
  dari_rekening_id      varchar(50)   NOT NULL
    REFERENCES fins_bank_rek(id_rekening) ON DELETE RESTRICT,
  ke_rekening_id        varchar(50)   NOT NULL
    REFERENCES fins_bank_rek(id_rekening) ON DELETE RESTRICT,
  jumlah                bigint        NOT NULL CHECK (jumlah > 0),
  biaya_transfer        bigint        NOT NULL DEFAULT 0 CHECK (biaya_transfer >= 0),
  tgl_kirim             date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_diterima          date,
  bukti_transfer_url    text,
  keterangan            varchar(300),
  status                varchar(15)   NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_transit','completed','failed','cancelled')),
  fins_trans_id_keluar  bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_masuk   bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_biaya   bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  period_id             bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  nik_input             varchar(20)   NOT NULL,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_internal_tf_diff_rek
    CHECK (dari_rekening_id != ke_rekening_id)
);

COMMENT ON TABLE  internal_transfers IS 'Transfer dana antar rekening milik organisasi sendiri';
COMMENT ON COLUMN internal_transfers.fins_trans_id_keluar IS 'Kredit dari_rekening (101.02.x), Debet 101.05.001 (in-transit)';
COMMENT ON COLUMN internal_transfers.fins_trans_id_masuk  IS 'Kredit 101.05.001 (in-transit), Debet ke_rekening (101.02.y)';
COMMENT ON COLUMN internal_transfers.fins_trans_id_biaya  IS 'Biaya transfer: Debet 502.xx, Kredit dari_rekening';

CREATE INDEX idx_internal_tf_dari   ON internal_transfers (dari_rekening_id);
CREATE INDEX idx_internal_tf_ke     ON internal_transfers (ke_rekening_id);
CREATE INDEX idx_internal_tf_status ON internal_transfers (status);
CREATE INDEX idx_internal_tf_tgl    ON internal_transfers (tgl_kirim DESC);

-- ============================================================
-- TABLE 4: petty_cash_books — Buku Kas Kecil per Kantor
-- ============================================================
DROP TABLE IF EXISTS petty_cash_books CASCADE;
CREATE TABLE petty_cash_books (
  id                bigserial     PRIMARY KEY,
  id_kantor         int           NOT NULL DEFAULT 1,
  nama_buku         varchar(100)  NOT NULL,
  nik_pemegang      varchar(20)   NOT NULL,
  nama_pemegang     varchar(200)  NOT NULL,
  saldo_awal        bigint        NOT NULL DEFAULT 0,
  saldo_maksimal    bigint        NOT NULL DEFAULT 5000000,
  saldo_saat_ini    bigint        NOT NULL DEFAULT 0,
  periode_bulan     smallint      NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun     smallint      NOT NULL,
  coa_kas_kecil     varchar(14)   NOT NULL DEFAULT '101.01.001.000',
  fins_bank_rek_id  varchar(50)   REFERENCES fins_bank_rek(id_rekening) ON DELETE SET NULL,
  status            varchar(10)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','closing','closed')),
  fins_trans_id_isi bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  period_id         bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (id_kantor, nik_pemegang, periode_bulan, periode_tahun)
);

COMMENT ON COLUMN petty_cash_books.fins_trans_id_isi IS 'Pengisian kas kecil: Debet 101.01.001, Kredit 101.02.xxx';

CREATE INDEX idx_petty_book_kantor ON petty_cash_books (id_kantor);
CREATE INDEX idx_petty_book_period ON petty_cash_books (periode_tahun DESC, periode_bulan DESC);
CREATE INDEX idx_petty_book_status ON petty_cash_books (status);

-- ============================================================
-- TABLE 5: petty_cash_transactions — Transaksi Kas Kecil
-- ============================================================
DROP TABLE IF EXISTS petty_cash_transactions CASCADE;
CREATE TABLE petty_cash_transactions (
  id                    bigserial     PRIMARY KEY,
  petty_cash_book_id    bigint        NOT NULL
    REFERENCES petty_cash_books(id) ON DELETE RESTRICT,
  tgl_transaksi         date          NOT NULL DEFAULT CURRENT_DATE,
  keterangan            varchar(300)  NOT NULL,
  jenis                 varchar(6)    NOT NULL CHECK (jenis IN ('masuk','keluar')),
  jumlah                bigint        NOT NULL CHECK (jumlah > 0),
  saldo_setelah         bigint        NOT NULL,
  coa                   varchar(14)   NOT NULL,   -- COA pengeluaran (502.xx)
  receipt_url           text,
  nik_input             varchar(20)   NOT NULL,
  expense_item_id       bigint        REFERENCES expense_items(id) ON DELETE SET NULL,
  fins_trans_id         bigint        REFERENCES fins_trans(id)    ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  petty_cash_transactions IS 'Transaksi kas kecil harian (pengeluaran operasional kecil)';
COMMENT ON COLUMN petty_cash_transactions.fins_trans_id IS 'Diisi saat rekap bulanan: Debet 502.xx, Kredit 101.01.001';

CREATE INDEX idx_petty_trx_book    ON petty_cash_transactions (petty_cash_book_id);
CREATE INDEX idx_petty_trx_tgl     ON petty_cash_transactions (tgl_transaksi DESC);
CREATE INDEX idx_petty_trx_coa     ON petty_cash_transactions (coa);
