-- ============================================================
-- NGO PSAK 45 — Pelaporan Keuangan Entitas Nirlaba
-- Tabel: fins_fund_restrictions, fins_net_asset_changes,
--        fins_activity_report_lines
-- Tambahan rows di fins_report untuk laporan PSAK 45
-- ============================================================

-- ============================================================
-- TABLE 1: fins_fund_restrictions — Klasifikasi Pembatasan Dana
-- PSAK 45 mewajibkan pemisahan: tidak terikat / terikat sementara
-- / terikat permanen
-- ============================================================
DROP TABLE IF EXISTS fins_fund_restrictions CASCADE;
CREATE TABLE fins_fund_restrictions (
  id                  bigserial     PRIMARY KEY,
  fins_trans_id       bigint        NOT NULL
    REFERENCES fins_trans(id) ON DELETE CASCADE,
  jenis_dana          varchar(20)   NOT NULL
                        CHECK (jenis_dana IN ('tidak_terikat','terikat_sementara','terikat_permanen')),
  keterangan_batasan  text,
  campaign_id         bigint        REFERENCES campaigns(id)   ON DELETE SET NULL,
  grant_id            bigint        REFERENCES grants(id)      ON DELETE SET NULL,
  coa_dana            varchar(14)   NOT NULL,   -- 300.06, 300.07, atau 300.08
  berlaku_mulai       date,
  berlaku_sampai      date,         -- NULL = permanen
  released_at         timestamptz,
  released_by         varchar(20),
  catatan_release     text,
  created_at          timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  fins_fund_restrictions IS 'Klasifikasi pembatasan dana sesuai PSAK 45: tidak terikat, terikat sementara, terikat permanen';
COMMENT ON COLUMN fins_fund_restrictions.jenis_dana         IS 'tidak_terikat=bebas dipakai, terikat_sementara=ada batas waktu/tujuan, terikat_permanen=endowment/wakaf';
COMMENT ON COLUMN fins_fund_restrictions.released_at        IS 'Tanggal pembatasan dilepas (tujuan tercapai atau waktu berakhir)';

CREATE INDEX idx_fund_restr_trans    ON fins_fund_restrictions (fins_trans_id);
CREATE INDEX idx_fund_restr_jenis    ON fins_fund_restrictions (jenis_dana);
CREATE INDEX idx_fund_restr_campaign ON fins_fund_restrictions (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_fund_restr_active   ON fins_fund_restrictions (berlaku_sampai)
  WHERE released_at IS NULL;

-- ============================================================
-- TABLE 2: fins_net_asset_changes — Perubahan Aset Bersih
-- Snapshot bulanan untuk Laporan Perubahan Aset Bersih (PSAK 45)
-- ============================================================
DROP TABLE IF EXISTS fins_net_asset_changes CASCADE;
CREATE TABLE fins_net_asset_changes (
  id                    bigserial     PRIMARY KEY,
  period_id             bigint        NOT NULL
    REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  -- Saldo awal aset bersih
  saldo_awal_tk         bigint        NOT NULL DEFAULT 0,
  saldo_awal_ts         bigint        NOT NULL DEFAULT 0,
  saldo_awal_tp         bigint        NOT NULL DEFAULT 0,
  -- Perubahan periode ini
  penerimaan_tk         bigint        NOT NULL DEFAULT 0,
  penerimaan_ts         bigint        NOT NULL DEFAULT 0,
  penerimaan_tp         bigint        NOT NULL DEFAULT 0,
  pengeluaran_tk        bigint        NOT NULL DEFAULT 0,
  pelepasan_batasan_ts  bigint        NOT NULL DEFAULT 0,
  pelepasan_batasan_tp  bigint        NOT NULL DEFAULT 0,
  -- Saldo akhir
  saldo_akhir_tk        bigint        GENERATED ALWAYS AS (
    saldo_awal_tk + penerimaan_tk - pengeluaran_tk + pelepasan_batasan_ts
  ) STORED,
  saldo_akhir_ts        bigint        GENERATED ALWAYS AS (
    saldo_awal_ts + penerimaan_ts - pelepasan_batasan_ts
  ) STORED,
  saldo_akhir_tp        bigint        GENERATED ALWAYS AS (
    saldo_awal_tp + penerimaan_tp - pelepasan_batasan_tp
  ) STORED,
  total_aset_bersih     bigint        GENERATED ALWAYS AS (
    (saldo_awal_tk + penerimaan_tk - pengeluaran_tk + pelepasan_batasan_ts)
    + (saldo_awal_ts + penerimaan_ts - pelepasan_batasan_ts)
    + (saldo_awal_tp + penerimaan_tp - pelepasan_batasan_tp)
  ) STORED,
  synced_at             timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (period_id)
);

COMMENT ON TABLE fins_net_asset_changes IS 'Laporan Perubahan Aset Bersih PSAK 45: TK=Tidak Terikat, TS=Terikat Sementara, TP=Terikat Permanen';

CREATE INDEX idx_net_asset_period ON fins_net_asset_changes (period_id);

-- ============================================================
-- TABLE 3: fins_calk_notes — Catatan Atas Laporan Keuangan
-- PSAK 45 wajib melampirkan CALK sebagai bagian dari laporan
-- ============================================================
DROP TABLE IF EXISTS fins_calk_notes CASCADE;
CREATE TABLE fins_calk_notes (
  id              bigserial     PRIMARY KEY,
  period_id       bigint        NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  nomor_catatan   smallint      NOT NULL,
  judul           varchar(300)  NOT NULL,
  isi             text          NOT NULL,
  tipe_konten     varchar(10)   NOT NULL DEFAULT 'text'
                    CHECK (tipe_konten IN ('text','table','number')),
  aktif           boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (period_id, nomor_catatan)
);

COMMENT ON TABLE fins_calk_notes IS 'Catatan Atas Laporan Keuangan (CALK) per periode, bagian dari laporan PSAK 45';

CREATE INDEX idx_calk_period ON fins_calk_notes (period_id);

-- ============================================================
-- Tambahan baris laporan PSAK 45 ke fins_report
-- ============================================================
INSERT INTO fins_report (nama_coa,level,coa,report,active,sort,keterangan,kode,dtu) VALUES
-- Laporan Aktivitas (LA) — PSAK 45
('<b>LAPORAN AKTIVITAS — PSAK 45</b>',             1,'','LA','y',  1,'','',NOW()),
('<b>Perubahan Aset Bersih Tidak Terikat</b>',     1,'','LA','y',  2,'','',NOW()),
('Penerimaan & Dukungan Tidak Terikat',            2,'401.00.000.000','LA','y',3,'','LA01',NOW()),
('Pengeluaran Program',                            2,'501.00.000.000','LA','y',4,'','LA02',NOW()),
('Pengeluaran Penunjang',                          2,'502.00.000.000','LA','y',5,'','LA03',NOW()),
('Pelepasan Batasan Dana',                         2,'','LA','y',  6,'Dari TS ke TK','LA04',NOW()),
('<b>Kenaikan Aset Bersih Tidak Terikat</b>',      3,'','LA','y',  7,'','LA_TK',NOW()),
('<b>Perubahan Aset Bersih Terikat Sementara</b>', 1,'','LA','y', 10,'','',NOW()),
('Penerimaan Terikat Sementara',                   2,'','LA','y', 11,'Grant, donasi terikat','LA05',NOW()),
('Pelepasan Batasan Terikat Sementara',            2,'','LA','y', 12,'-=mengurangi saldo TS','LA06',NOW()),
('<b>Kenaikan Aset Bersih Terikat Sementara</b>',  3,'','LA','y', 13,'','LA_TS',NOW()),
('<b>Perubahan Aset Bersih Terikat Permanen</b>',  1,'','LA','y', 20,'','',NOW()),
('Penerimaan Terikat Permanen',                    2,'','LA','y', 21,'Wakaf, endowment','LA07',NOW()),
('<b>Kenaikan Aset Bersih Terikat Permanen</b>',   3,'','LA','y', 22,'','LA_TP',NOW()),
('<b>KENAIKAN (PENURUNAN) ASET BERSIH</b>',        4,'','LA','y', 30,'LA_TK+LA_TS+LA_TP','LA_TOTAL',NOW()),
('Aset Bersih Awal Periode',                       2,'300.00.000.000','LA','y',31,'Saldo awal','LA_AWAL',NOW()),
('<b>ASET BERSIH AKHIR PERIODE</b>',               4,'300.00.000.000','LA','y',32,'','LA_AKHIR',NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- VIEW: v_psak45_summary — Ringkasan posisi PSAK 45 saat ini
-- ============================================================
CREATE OR REPLACE VIEW v_psak45_summary AS
SELECT
  fc.coa,
  fc.nama_coa,
  CASE
    WHEN fc.coa = '300.06.000.000' THEN 'Tidak Terikat'
    WHEN fc.coa = '300.07.000.000' THEN 'Terikat Sementara'
    WHEN fc.coa = '300.08.000.000' THEN 'Terikat Permanen'
    ELSE 'Lainnya'
  END                                                  AS jenis_dana,
  COALESCE(SUM(fj.kredit) - SUM(fj.debet), 0)         AS saldo_berjalan
FROM fins_coa fc
LEFT JOIN fins_jurnal fj ON fj.coa = fc.coa
WHERE fc.coa IN ('300.06.000.000','300.07.000.000','300.08.000.000')
GROUP BY fc.coa, fc.nama_coa;

COMMENT ON VIEW v_psak45_summary IS 'Ringkasan saldo aset bersih per klasifikasi PSAK 45 (real-time dari fins_jurnal)';
