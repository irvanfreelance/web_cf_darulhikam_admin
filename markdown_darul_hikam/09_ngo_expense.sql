-- ============================================================
-- NGO Pengeluaran Operasional
-- Tabel: vendors, purchase_orders, po_items,
--        expense_requests, expense_items, cash_advances
-- ============================================================

-- ============================================================
-- TABLE 1: vendors — Master Supplier / Vendor
-- ============================================================
DROP TABLE IF EXISTS vendors CASCADE;
CREATE TABLE vendors (
  id              bigserial     PRIMARY KEY,
  kode_vendor     varchar(20)   NOT NULL UNIQUE,
  nama_vendor     varchar(200)  NOT NULL,
  npwp            varchar(20)   UNIQUE,
  kategori        varchar(30)   NOT NULL DEFAULT 'barang'
                    CHECK (kategori IN ('barang','jasa','media','konsultan','peternak','catering','logistik','lainnya')),
  alamat          text,
  kota            varchar(100),
  kontak_pic      varchar(200),
  telepon         varchar(20),
  email           varchar(150),
  nama_rekening   varchar(200),
  nomor_rekening  varchar(50),
  id_bank         varchar(5)    REFERENCES fins_bank(id_bank) ON DELETE SET NULL,
  fins_bank_rek_id varchar(50)  REFERENCES fins_bank_rek(id_rekening) ON DELETE SET NULL,
  termin_bayar    smallint      NOT NULL DEFAULT 14,  -- hari
  top_vendor      varchar(20)   DEFAULT 'net14'
                    CHECK (top_vendor IN ('cod','net7','net14','net30','net45','net60')),
  active          varchar(1)    NOT NULL DEFAULT 'y' CHECK (active IN ('y','n')),
  catatan         text,
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW(),
  deleted_at      timestamptz
);

COMMENT ON TABLE  vendors IS 'Master supplier/vendor/peternak untuk kebutuhan operasional & program';
COMMENT ON COLUMN vendors.kode_vendor IS 'Format: VND-XXXXXX';

CREATE INDEX idx_vendors_kategori ON vendors (kategori);
CREATE INDEX idx_vendors_active   ON vendors (active) WHERE active = 'y';
CREATE INDEX idx_vendors_deleted  ON vendors (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE 2: purchase_orders — PO ke Vendor
-- ============================================================
DROP TABLE IF EXISTS purchase_orders CASCADE;
CREATE TABLE purchase_orders (
  id              bigserial     PRIMARY KEY,
  nomor_po        varchar(30)   NOT NULL UNIQUE,
  vendor_id       bigint        NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  campaign_id     bigint        REFERENCES campaigns(id) ON DELETE SET NULL,
  judul           varchar(300)  NOT NULL,
  total_amount    bigint        NOT NULL CHECK (total_amount > 0),
  dp_amount       bigint        NOT NULL DEFAULT 0,
  sisa_bayar      bigint        GENERATED ALWAYS AS (total_amount - dp_amount) STORED,
  status          varchar(15)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','sent','partial','received','paid','cancelled')),
  tgl_po          date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_jatuh_tempo date,
  tgl_received    date,
  tgl_bayar       date,
  nik_pembuat     varchar(20)   NOT NULL,
  nik_approver    varchar(20),
  catatan         text,
  po_pdf_url      text,
  fins_trans_id_dp    bigint   REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_lunas bigint   REFERENCES fins_trans(id) ON DELETE SET NULL,
  disbursement_request_id bigint REFERENCES disbursement_requests(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN purchase_orders.fins_trans_id_dp    IS 'fins_trans DP (Debet 101.04.002, Kredit 101.02.xxx)';
COMMENT ON COLUMN purchase_orders.fins_trans_id_lunas IS 'fins_trans pelunasan (Debet 201.03, Kredit 101.02.xxx)';

CREATE INDEX idx_po_vendor   ON purchase_orders (vendor_id);
CREATE INDEX idx_po_campaign ON purchase_orders (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_po_status   ON purchase_orders (status);
CREATE INDEX idx_po_tgl      ON purchase_orders (tgl_po DESC);
CREATE INDEX idx_po_jatuh_tempo ON purchase_orders (tgl_jatuh_tempo) WHERE status NOT IN ('paid','cancelled');

-- ============================================================
-- TABLE 3: po_items — Rincian Item PO
-- ============================================================
DROP TABLE IF EXISTS po_items CASCADE;
CREATE TABLE po_items (
  id              bigserial     PRIMARY KEY,
  purchase_order_id bigint      NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  keterangan      varchar(300)  NOT NULL,
  spesifikasi     text,
  qty             numeric(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  satuan          varchar(30),
  harga_satuan    bigint        NOT NULL CHECK (harga_satuan >= 0),
  subtotal        bigint        GENERATED ALWAYS AS (ROUND(qty * harga_satuan)::bigint) STORED,
  coa             varchar(14)   NOT NULL,  -- COA pengeluaran (502.xx atau 501.xx)
  received_qty    numeric(10,2) NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_items_po  ON po_items (purchase_order_id);
CREATE INDEX idx_po_items_coa ON po_items (coa);

-- ============================================================
-- TABLE 4: expense_requests — Pengajuan Pengeluaran / Reimbursement
-- ============================================================
DROP TABLE IF EXISTS expense_requests CASCADE;
CREATE TABLE expense_requests (
  id              bigserial     PRIMARY KEY,
  nomor_expense   varchar(30)   NOT NULL UNIQUE,
  judul           varchar(300)  NOT NULL,
  jenis           varchar(25)   NOT NULL
                    CHECK (jenis IN ('reimbursement','pembayaran_langsung','kasbon_settlement','operasional_rutin')),
  total_amount    bigint        NOT NULL CHECK (total_amount > 0),
  campaign_id     bigint        REFERENCES campaigns(id) ON DELETE SET NULL,
  vendor_id       bigint        REFERENCES vendors(id)   ON DELETE SET NULL,
  coa_debet       varchar(14)   NOT NULL,   -- COA pengeluaran (502.xx)
  coa_kredit      varchar(14)   NOT NULL,   -- COA bank (101.02.xxx) atau kas (101.01.xxx)
  status          varchar(15)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','paid','rejected','cancelled')),
  nik_pengaju     varchar(20)   NOT NULL,
  nik_approver    varchar(20),
  tgl_pengajuan   date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_approval    timestamptz,
  tgl_bayar       timestamptz,
  metode_bayar    varchar(20)   DEFAULT 'transfer'
                    CHECK (metode_bayar IN ('transfer','tunai','cek','giro')),
  catatan         text,
  catatan_approver text,
  fins_trans_id   bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  cash_advance_id bigint,       -- FK ke cash_advances (lihat bawah)
  period_id       bigint,       -- FK ke accounting_periods (file 10)
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  expense_requests IS 'Pengajuan pengeluaran operasional: reimbursement, pembayaran vendor, settlement kas bon';
COMMENT ON COLUMN expense_requests.fins_trans_id IS 'Diisi saat paid: fins_trans jenis=e (Debet COA biaya, Kredit bank/kas)';

CREATE INDEX idx_expense_campaign ON expense_requests (campaign_id)  WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_expense_vendor   ON expense_requests (vendor_id)    WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_expense_status   ON expense_requests (status);
CREATE INDEX idx_expense_pengaju  ON expense_requests (nik_pengaju);
CREATE INDEX idx_expense_tgl      ON expense_requests (tgl_pengajuan DESC);
CREATE INDEX idx_expense_fins     ON expense_requests (fins_trans_id) WHERE fins_trans_id IS NOT NULL;

-- ============================================================
-- TABLE 5: expense_items — Rincian Item Expense
-- ============================================================
DROP TABLE IF EXISTS expense_items CASCADE;
CREATE TABLE expense_items (
  id              bigserial     PRIMARY KEY,
  expense_request_id bigint     NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  keterangan      varchar(300)  NOT NULL,
  tgl_transaksi   date,
  qty             numeric(10,2) NOT NULL DEFAULT 1,
  satuan          varchar(30),
  harga_satuan    bigint        NOT NULL CHECK (harga_satuan >= 0),
  subtotal        bigint        GENERATED ALWAYS AS (ROUND(qty * harga_satuan)::bigint) STORED,
  coa             varchar(14)   NOT NULL,
  receipt_url     text,
  created_at      timestamptz   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_items_req ON expense_items (expense_request_id);
CREATE INDEX idx_expense_items_coa ON expense_items (coa);

-- ============================================================
-- TABLE 6: cash_advances — Kas Bon / Uang Muka Staf
-- ============================================================
DROP TABLE IF EXISTS cash_advances CASCADE;
CREATE TABLE cash_advances (
  id                bigserial     PRIMARY KEY,
  nomor_kasbon      varchar(30)   NOT NULL UNIQUE,
  nik_staf          varchar(20)   NOT NULL,
  nama_staf         varchar(200)  NOT NULL,
  jumlah_advance    bigint        NOT NULL CHECK (jumlah_advance > 0),
  tujuan            text          NOT NULL,
  tgl_kasbon        date          NOT NULL DEFAULT CURRENT_DATE,
  tgl_jatuh_tempo   date          NOT NULL,
  tgl_settlement    date,
  jumlah_direalisasi bigint       NOT NULL DEFAULT 0,
  jumlah_dikembalikan bigint      NOT NULL DEFAULT 0,
  sisa_kasbon       bigint        GENERATED ALWAYS AS
    (jumlah_advance - jumlah_direalisasi - jumlah_dikembalikan) STORED,
  status            varchar(15)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','settled','overdue','cancelled')),
  fins_trans_id_keluar  bigint    REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_kembali bigint    REFERENCES fins_trans(id) ON DELETE SET NULL,
  expense_request_id    bigint    REFERENCES expense_requests(id) ON DELETE SET NULL,
  nik_approver      varchar(20),
  catatan           text,
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN cash_advances.fins_trans_id_keluar  IS 'Debet 101.04.001 (piutang staf), Kredit 101.01/101.02 (kas/bank)';
COMMENT ON COLUMN cash_advances.fins_trans_id_kembali IS 'Debet 502.xx (biaya realisasi) + Debet 101.01 (kembalian), Kredit 101.04.001';

CREATE INDEX idx_kasbon_nik     ON cash_advances (nik_staf);
CREATE INDEX idx_kasbon_status  ON cash_advances (status);
CREATE INDEX idx_kasbon_jatuh   ON cash_advances (tgl_jatuh_tempo) WHERE status = 'active';

-- Tambah FK expense_requests.cash_advance_id
ALTER TABLE expense_requests
  ADD CONSTRAINT fk_expense_kasbon
    FOREIGN KEY (cash_advance_id) REFERENCES cash_advances(id) ON DELETE SET NULL;
