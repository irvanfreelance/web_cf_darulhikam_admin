-- ============================================================
-- NGO Rekonsiliasi Bank
-- Tabel: bank_statements, bank_reconciliation_items
-- Alur: import mutasi rekening → match ke fins_jurnal
--       → identifikasi selisih → adjustment
-- ============================================================

-- ============================================================
-- TABLE 1: bank_statements — Mutasi Rekening dari Bank
-- Import CSV/XLSX statement bulanan dari BCA/Mandiri/dll
-- ============================================================
DROP TABLE IF EXISTS bank_statements CASCADE;
CREATE TABLE bank_statements (
  id                  bigserial     PRIMARY KEY,
  fins_bank_rek_id    varchar(50)   NOT NULL
    REFERENCES fins_bank_rek(id_rekening) ON DELETE RESTRICT,
  period_id           bigint        NOT NULL
    REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  tanggal             date          NOT NULL,
  jam                 time,
  nomor_referensi     varchar(100),
  keterangan          text          NOT NULL,
  jenis               varchar(1)    NOT NULL CHECK (jenis IN ('D','K')),  -- D=debet/keluar, K=kredit/masuk
  debet               bigint        NOT NULL DEFAULT 0 CHECK (debet >= 0),
  kredit              bigint        NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  saldo_setelah       bigint,
  sumber_import       varchar(20)   NOT NULL DEFAULT 'manual'
                        CHECK (sumber_import IN ('manual','csv','xlsx','api_bank')),
  batch_import_id     varchar(50),  -- ID sesi import, untuk rollback
  reconciled_status   varchar(15)   NOT NULL DEFAULT 'unmatched'
                        CHECK (reconciled_status IN ('unmatched','matched','manual','exception','ignored')),
  matched_fins_jurnal_id bigint     REFERENCES fins_jurnal(id) ON DELETE SET NULL,
  catatan_rekonsiliasi text,
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  updated_at          timestamptz   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bank_stmt_debet_kredit
    CHECK ((debet > 0 AND kredit = 0) OR (debet = 0 AND kredit > 0))
);

COMMENT ON TABLE  bank_statements IS 'Mutasi rekening bank hasil import dari statement/CSV/API bank';
COMMENT ON COLUMN bank_statements.jenis IS 'D=dana keluar dari rekening, K=dana masuk ke rekening';
COMMENT ON COLUMN bank_statements.reconciled_status IS 'unmatched=belum dicocokkan, matched=auto-match, manual=cocok manual, exception=selisih, ignored=abaikan (fee bank dll)';
COMMENT ON COLUMN bank_statements.batch_import_id IS 'UUID sesi import untuk rollback bila ada kesalahan';

CREATE INDEX idx_bank_stmt_rek       ON bank_statements (fins_bank_rek_id);
CREATE INDEX idx_bank_stmt_period    ON bank_statements (period_id);
CREATE INDEX idx_bank_stmt_tanggal   ON bank_statements (tanggal DESC);
CREATE INDEX idx_bank_stmt_status    ON bank_statements (reconciled_status);
CREATE INDEX idx_bank_stmt_batch     ON bank_statements (batch_import_id) WHERE batch_import_id IS NOT NULL;
CREATE INDEX idx_bank_stmt_unmatched ON bank_statements (fins_bank_rek_id, tanggal DESC)
  WHERE reconciled_status = 'unmatched';
-- Composite untuk auto-matching: cari fins_jurnal dgn nominal & tanggal yg sama
CREATE INDEX idx_bank_stmt_match_key ON bank_statements (fins_bank_rek_id, kredit, tanggal)
  WHERE reconciled_status = 'unmatched' AND kredit > 0;

-- ============================================================
-- TABLE 2: bank_reconciliation_items — Detail Pencocokan
-- Satu bank_statement bisa match ke satu atau lebih fins_jurnal
-- (partial match untuk settlement yang dibatch gateway)
-- ============================================================
DROP TABLE IF EXISTS bank_reconciliation_items CASCADE;
CREATE TABLE bank_reconciliation_items (
  id                  bigserial     PRIMARY KEY,
  bank_statement_id   bigint        NOT NULL
    REFERENCES bank_statements(id) ON DELETE CASCADE,
  fins_jurnal_id      bigint        NOT NULL
    REFERENCES fins_jurnal(id) ON DELETE RESTRICT,
  jumlah_match        bigint        NOT NULL CHECK (jumlah_match > 0),
  match_type          varchar(15)   NOT NULL DEFAULT 'auto'
                        CHECK (match_type IN ('auto','manual','partial')),
  matched_by          varchar(20),
  matched_at          timestamptz   NOT NULL DEFAULT NOW(),
  selisih             bigint        NOT NULL DEFAULT 0,
  catatan             text,
  created_at          timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  bank_reconciliation_items IS 'Pencocokan satu baris statement bank dengan fins_jurnal';
COMMENT ON COLUMN bank_reconciliation_items.match_type IS 'auto=sistem, manual=finance staff, partial=sebagian (batch settlement)';
COMMENT ON COLUMN bank_reconciliation_items.selisih    IS 'Selisih antara nilai statement dengan fins_jurnal (idealnya 0)';

CREATE INDEX idx_recon_items_stmt   ON bank_reconciliation_items (bank_statement_id);
CREATE INDEX idx_recon_items_jurnal ON bank_reconciliation_items (fins_jurnal_id);
CREATE UNIQUE INDEX idx_recon_items_unique ON bank_reconciliation_items (bank_statement_id, fins_jurnal_id);

-- ============================================================
-- TABLE 3: bank_reconciliation_reports — Laporan Rekonsiliasi Bulanan
-- Snapshot hasil rekon per rekening per periode
-- ============================================================
DROP TABLE IF EXISTS bank_reconciliation_reports CASCADE;
CREATE TABLE bank_reconciliation_reports (
  id                    bigserial     PRIMARY KEY,
  fins_bank_rek_id      varchar(50)   NOT NULL
    REFERENCES fins_bank_rek(id_rekening) ON DELETE RESTRICT,
  period_id             bigint        NOT NULL
    REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  saldo_bank_statement  bigint        NOT NULL DEFAULT 0,
  saldo_buku_fins       bigint        NOT NULL DEFAULT 0,
  selisih               bigint        GENERATED ALWAYS AS (saldo_bank_statement - saldo_buku_fins) STORED,
  total_unmatched_stmt  int           NOT NULL DEFAULT 0,
  total_unmatched_jurnal int          NOT NULL DEFAULT 0,
  status                varchar(15)   NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','approved','finalized')),
  nik_pembuat           varchar(20)   NOT NULL,
  nik_approver          varchar(20),
  tgl_rekonsiliasi      date,
  pdf_url               text,
  catatan               text,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (fins_bank_rek_id, period_id)
);

COMMENT ON TABLE bank_reconciliation_reports IS 'Laporan rekonsiliasi bank bulanan per rekening';

CREATE INDEX idx_recon_report_period ON bank_reconciliation_reports (period_id);
CREATE INDEX idx_recon_report_status ON bank_reconciliation_reports (status);
