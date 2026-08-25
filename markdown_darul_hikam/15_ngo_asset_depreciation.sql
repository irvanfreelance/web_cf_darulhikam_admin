-- ============================================================
-- NGO Penyusutan Aset Tetap (Scheduled Depreciation)
-- Tabel: asset_depreciation_schedules
-- Dijalankan otomatis oleh Upstash Cron tiap awal bulan
-- ============================================================

-- ============================================================
-- TABLE 1: asset_depreciation_schedules — Jadwal Penyusutan
-- ============================================================
DROP TABLE IF EXISTS asset_depreciation_schedules CASCADE;
CREATE TABLE asset_depreciation_schedules (
  id                  bigserial     PRIMARY KEY,
  fins_aset_id        bigint        NOT NULL
    REFERENCES fins_aset(id) ON DELETE CASCADE,
  periode_bulan       smallint      NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun       smallint      NOT NULL CHECK (periode_tahun >= 2020),
  urutan_periode      int           NOT NULL CHECK (urutan_periode >= 1),
  nilai_buku_awal     bigint        NOT NULL CHECK (nilai_buku_awal >= 0),
  nilai_susut         bigint        NOT NULL CHECK (nilai_susut >= 0),
  nilai_buku_akhir    bigint        GENERATED ALWAYS AS (nilai_buku_awal - nilai_susut) STORED,
  akumulasi_susut     bigint        NOT NULL DEFAULT 0,
  metode              varchar(20)   NOT NULL DEFAULT 'Garis Lurus'
                        CHECK (metode IN ('Garis Lurus','Saldo Menurun','Jumlah Angka Tahun')),
  status              varchar(15)   NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','posted','skipped','reversed')),
  fins_trans_id       bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  period_id           bigint        REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  posted_at           timestamptz,
  posted_by           varchar(20)   DEFAULT 'SYSTEM_CRON',
  catatan             text,
  created_at          timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (fins_aset_id, periode_bulan, periode_tahun)
);

COMMENT ON TABLE  asset_depreciation_schedules IS 'Jadwal penyusutan aset tetap per bulan, diposting otomatis Upstash Cron';
COMMENT ON COLUMN asset_depreciation_schedules.urutan_periode IS 'Bulan ke-N dari masa manfaat aset';
COMMENT ON COLUMN asset_depreciation_schedules.fins_trans_id  IS 'Debet 502.06 (beban penyusutan), Kredit 102.99.001 (akum. penyusutan)';
COMMENT ON COLUMN asset_depreciation_schedules.status         IS 'scheduled=belum jatuh tempo, posted=sudah dijurnal, skipped=dilewati, reversed=dibatalkan';

CREATE INDEX idx_depr_aset   ON asset_depreciation_schedules (fins_aset_id);
CREATE INDEX idx_depr_period ON asset_depreciation_schedules (periode_tahun DESC, periode_bulan DESC);
CREATE INDEX idx_depr_status ON asset_depreciation_schedules (status);
CREATE INDEX idx_depr_scheduled ON asset_depreciation_schedules (periode_tahun, periode_bulan)
  WHERE status = 'scheduled';

-- ============================================================
-- FUNCTION: generate_depreciation_schedule(aset_id)
-- Generate jadwal penyusutan dari data fins_aset
-- Dipanggil saat aset baru ditambahkan
-- ============================================================
CREATE OR REPLACE FUNCTION generate_depreciation_schedule(p_aset_id bigint)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_aset            fins_aset%ROWTYPE;
  v_nilai_buku      bigint;
  v_nilai_susut     bigint;
  v_akumulasi       bigint := 0;
  v_periode_bulan   smallint;
  v_periode_tahun   smallint;
  v_urutan          int := 1;
  v_inserted        int := 0;
  v_tgl_mulai       date;
BEGIN
  SELECT * INTO v_aset FROM fins_aset WHERE id = p_aset_id AND deleted = 'n';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aset id=% tidak ditemukan atau sudah dihapus', p_aset_id;
  END IF;

  v_nilai_buku  := v_aset.biaya_akuisisi;
  v_tgl_mulai   := v_aset.tgl_akuisisi;
  v_periode_bulan := EXTRACT(MONTH FROM v_tgl_mulai)::smallint;
  v_periode_tahun := EXTRACT(YEAR  FROM v_tgl_mulai)::smallint;

  -- Susut bulanan Garis Lurus = biaya_akuisisi / masa_manfaat
  v_nilai_susut := ROUND(v_aset.biaya_akuisisi::numeric / v_aset.masa_manfaat);

  FOR i IN 1..v_aset.masa_manfaat LOOP
    v_akumulasi := v_akumulasi + v_nilai_susut;
    -- Periode terakhir: susut = sisa nilai buku (hindari selisih pembulatan)
    IF i = v_aset.masa_manfaat THEN
      v_nilai_susut := v_nilai_buku;
    END IF;

    INSERT INTO asset_depreciation_schedules (
      fins_aset_id, periode_bulan, periode_tahun, urutan_periode,
      nilai_buku_awal, nilai_susut, akumulasi_susut, metode, status
    ) VALUES (
      p_aset_id, v_periode_bulan, v_periode_tahun, i,
      v_nilai_buku, v_nilai_susut, v_akumulasi, v_aset.metode, 'scheduled'
    )
    ON CONFLICT (fins_aset_id, periode_bulan, periode_tahun) DO NOTHING;

    v_nilai_buku := v_nilai_buku - v_nilai_susut;
    v_inserted   := v_inserted + 1;

    -- Advance ke bulan berikutnya
    IF v_periode_bulan = 12 THEN
      v_periode_bulan := 1;
      v_periode_tahun := v_periode_tahun + 1;
    ELSE
      v_periode_bulan := v_periode_bulan + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION generate_depreciation_schedule IS
  'Generate jadwal penyusutan bulanan untuk satu aset. '
  'Dipanggil saat aset baru disimpan: SELECT generate_depreciation_schedule(aset_id)';

-- ============================================================
-- Generate jadwal penyusutan untuk aset seed yang sudah ada
-- ============================================================
DO $$
DECLARE r RECORD; n int;
BEGIN
  FOR r IN SELECT id FROM fins_aset WHERE deleted = 'n' LOOP
    n := generate_depreciation_schedule(r.id);
    RAISE NOTICE 'Aset id=% → % baris jadwal penyusutan dibuat', r.id, n;
  END LOOP;
END $$;
