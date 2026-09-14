-- ============================================================
-- NGO Periode Akuntansi & Tutup Buku
-- Tabel: accounting_periods, period_adjusting_entries
-- ============================================================

-- ============================================================
-- TABLE 1: accounting_periods — Periode Akuntansi (Tutup Buku)
-- Saat status=closed, seluruh fins_trans & fins_jurnal
-- pada periode itu tidak boleh diubah/hapus.
-- ============================================================
DROP TABLE IF EXISTS accounting_periods CASCADE;
CREATE TABLE accounting_periods (
  id              bigserial     PRIMARY KEY,
  periode_bulan   smallint      NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun   smallint      NOT NULL CHECK (periode_tahun >= 2020),
  nama_periode    varchar(50),
  tgl_mulai       date          GENERATED ALWAYS AS (
    MAKE_DATE(periode_tahun::int, periode_bulan::int, 1)
  ) STORED,
  tgl_selesai     date          GENERATED ALWAYS AS (
    (MAKE_DATE(periode_tahun::int, periode_bulan::int, 1)
      + INTERVAL '1 month - 1 day')::date
  ) STORED,
  status          varchar(10)   NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closing','closed')),
  total_penerimaan bigint       NOT NULL DEFAULT 0,
  total_pengeluaran bigint      NOT NULL DEFAULT 0,
  surplus_defisit  bigint       GENERATED ALWAYS AS (total_penerimaan - total_pengeluaran) STORED,
  nik_closing     varchar(20),
  tgl_open        timestamptz   NOT NULL DEFAULT NOW(),
  tgl_closing     timestamptz,
  tgl_closed      timestamptz,
  catatan         text,
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (periode_bulan, periode_tahun)
);

COMMENT ON TABLE  accounting_periods IS 'Periode akuntansi bulanan dengan mekanisme tutup buku';
COMMENT ON COLUMN accounting_periods.status IS 'open=aktif input, closing=sedang proses tutup buku, closed=terkunci tidak bisa edit';

CREATE INDEX idx_periods_status  ON accounting_periods (status);
CREATE INDEX idx_periods_tahun   ON accounting_periods (periode_tahun DESC, periode_bulan DESC);

-- Tambah FK dari fins_trans & fins_jurnal ke accounting_periods
-- (dilakukan via ALTER agar tidak circular dependency)
ALTER TABLE fins_trans   ADD COLUMN IF NOT EXISTS period_id bigint REFERENCES accounting_periods(id) ON DELETE RESTRICT;
ALTER TABLE fins_jurnal  ADD COLUMN IF NOT EXISTS period_id bigint REFERENCES accounting_periods(id) ON DELETE RESTRICT;
ALTER TABLE fins_opname  ADD COLUMN IF NOT EXISTS period_id bigint REFERENCES accounting_periods(id) ON DELETE RESTRICT;
ALTER TABLE fins_budget  ADD COLUMN IF NOT EXISTS period_id bigint REFERENCES accounting_periods(id) ON DELETE SET NULL;

CREATE INDEX idx_fins_trans_period  ON fins_trans  (period_id) WHERE period_id IS NOT NULL;
CREATE INDEX idx_fins_jurnal_period ON fins_jurnal (period_id) WHERE period_id IS NOT NULL;

-- Tambah FK dari disbursement_requests & expense_requests
ALTER TABLE disbursement_requests ADD CONSTRAINT fk_disbursement_period
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id) ON DELETE RESTRICT;
ALTER TABLE expense_requests ADD CONSTRAINT fk_expense_period
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id) ON DELETE RESTRICT;

-- ============================================================
-- TABLE 2: period_adjusting_entries — Jurnal Penyesuaian AJE
-- Dibuat saat closing: akrual, depresiasi, koreksi
-- ============================================================
DROP TABLE IF EXISTS period_adjusting_entries CASCADE;
CREATE TABLE period_adjusting_entries (
  id              bigserial     PRIMARY KEY,
  period_id       bigint        NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  jenis_aje       varchar(30)   NOT NULL
                    CHECK (jenis_aje IN ('akrual','depresiasi','koreksi','penutup','balik')),
  keterangan      varchar(300)  NOT NULL,
  coa_debet       varchar(14)   NOT NULL,
  coa_kredit      varchar(14)   NOT NULL,
  nominal         bigint        NOT NULL CHECK (nominal > 0),
  fins_trans_id   bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_jurnal_debet_id bigint   REFERENCES fins_jurnal(id) ON DELETE SET NULL,
  fins_jurnal_kredit_id bigint  REFERENCES fins_jurnal(id) ON DELETE SET NULL,
  is_reversal     boolean       NOT NULL DEFAULT false,
  reversal_of_id  bigint        REFERENCES period_adjusting_entries(id) ON DELETE SET NULL,
  nik_input       varchar(20)   NOT NULL,
  approved_by     varchar(20),
  approved_at     timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  period_adjusting_entries IS 'Jurnal penyesuaian akhir periode: akrual, depresiasi, koreksi, penutup';
COMMENT ON COLUMN period_adjusting_entries.jenis_aje   IS 'akrual=beban yg blm dibayar, depresiasi=susut aset, koreksi=salah catat, penutup=transfer ke ekuitas, balik=reversal';
COMMENT ON COLUMN period_adjusting_entries.is_reversal IS 'true=ini adalah pembalik AJE bulan lalu (otomatis di awal bulan baru)';

CREATE INDEX idx_aje_period ON period_adjusting_entries (period_id);
CREATE INDEX idx_aje_jenis  ON period_adjusting_entries (jenis_aje);
CREATE INDEX idx_aje_reversal ON period_adjusting_entries (reversal_of_id) WHERE reversal_of_id IS NOT NULL;

-- ============================================================
-- Seed: Periode akuntansi Mei & Oktober 2026
-- (sesuai data transaksi yang ada di fins_trans seed)
-- ============================================================
INSERT INTO accounting_periods (
  periode_bulan, periode_tahun, status,
  total_penerimaan, total_pengeluaran, nik_closing, tgl_closed
) VALUES
(5,  2026, 'closed', 1885000, 0, 'ADMIN001', '2026-06-05 01:00:00+00'),
(6,  2026, 'closed',       0, 0, 'ADMIN001', '2026-07-05 01:00:00+00'),
(7,  2026, 'closed',       0, 0, 'ADMIN001', '2026-08-05 01:00:00+00'),
(8,  2026, 'closed',       0, 0, 'ADMIN001', '2026-09-05 01:00:00+00'),
(9,  2026, 'closed',       0, 0, 'ADMIN001', '2026-10-05 01:00:00+00'),
(10, 2026, 'closed', 30020000, 0,'ADMIN001', '2026-11-05 01:00:00+00'),
(11, 2026, 'closed',       0, 0, 'ADMIN001', '2026-12-05 01:00:00+00'),
(12, 2026, 'closed',       0, 0, 'ADMIN001', '2027-01-05 01:00:00+00'),
(1,  2027, 'open',         0, 0, NULL,        NULL),
(2,  2027, 'open',         0, 0, NULL,        NULL),
(3,  2027, 'open',         0, 0, NULL,        NULL),
(4,  2027, 'open',         0, 0, NULL,        NULL),
(5,  2027, 'open',         0, 0, NULL,        NULL),
(6,  2027, 'open',         0, 0, NULL,        NULL),
(7,  2027, 'open',         0, 0, NULL,        NULL)
ON CONFLICT (periode_bulan, periode_tahun) DO NOTHING;

-- Update fins_trans dengan period_id sesuai tgl_exre
UPDATE fins_trans ft
SET period_id = ap.id
FROM accounting_periods ap
WHERE EXTRACT(MONTH FROM ft.tgl_exre) = ap.periode_bulan
  AND EXTRACT(YEAR  FROM ft.tgl_exre) = ap.periode_tahun;

-- Update fins_jurnal dengan period_id sesuai tgl_exre
UPDATE fins_jurnal fj
SET period_id = ap.id
FROM accounting_periods ap
WHERE EXTRACT(MONTH FROM fj.tgl_exre) = ap.periode_bulan
  AND EXTRACT(YEAR  FROM fj.tgl_exre) = ap.periode_tahun;
