-- ============================================================
-- NGO Program Khusus: Qurban & Zakat
-- Tabel: qurban_animals, qurban_shahibul, qurban_distributions,
--        zakat_distributions, zakat_amil_fee
-- ============================================================

-- ============================================================
-- TABLE 1: qurban_animals — Register Hewan Qurban
-- ============================================================
DROP TABLE IF EXISTS qurban_animals CASCADE;
CREATE TABLE qurban_animals (
  id                    bigserial     PRIMARY KEY,
  kode_hewan            varchar(20)   NOT NULL UNIQUE,
  campaign_id           bigint        NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  jenis_hewan           varchar(10)   NOT NULL CHECK (jenis_hewan IN ('kambing','sapi','domba','kerbau')),
  kapasitas_peserta     smallint      NOT NULL DEFAULT 1,  -- 1=kambing/domba, 7=sapi/kerbau
  berat_kg              numeric(6,2),
  kondisi               varchar(20)   DEFAULT 'sehat'
                          CHECK (kondisi IN ('sehat','sakit','cacat','mati')),
  nama_peternak         varchar(200),
  kontak_peternak       varchar(20),
  alamat_peternak       text,
  lokasi_sembelih       text,
  harga_beli            bigint        NOT NULL CHECK (harga_beli > 0),
  biaya_operasional     bigint        NOT NULL DEFAULT 0,
  total_biaya           bigint        GENERATED ALWAYS AS (harga_beli + biaya_operasional) STORED,
  status                varchar(20)   NOT NULL DEFAULT 'dipesan'
                          CHECK (status IN ('dipesan','dibeli','dalam_perjalanan','tiba','disembelih','didistribusikan','batal')),
  tgl_pesan             date,
  tgl_beli              date,
  tgl_tiba              date,
  tgl_sembelih          date,
  tgl_distribusi        date,
  foto_hewan_url        text,
  foto_sembelih_url     text,
  coa_hewan             varchar(14)   DEFAULT '102.02.001.000',  -- persediaan hewan
  fins_trans_id_beli    bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_salur   bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  catatan               text,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  updated_at            timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  qurban_animals IS 'Register hewan qurban per campaign musim haji';
COMMENT ON COLUMN qurban_animals.kapasitas_peserta   IS '1=kambing/domba, 7=sapi/kerbau (patungan)';
COMMENT ON COLUMN qurban_animals.fins_trans_id_beli  IS 'fins_trans pembelian hewan (Debet 102.02, Kredit 101.02)';
COMMENT ON COLUMN qurban_animals.fins_trans_id_salur IS 'fins_trans penyaluran (Debet 501.06, Kredit 102.02)';

CREATE INDEX idx_qurban_animals_campaign ON qurban_animals (campaign_id);
CREATE INDEX idx_qurban_animals_status   ON qurban_animals (status);
CREATE INDEX idx_qurban_animals_tgl_sembelih ON qurban_animals (tgl_sembelih DESC) WHERE tgl_sembelih IS NOT NULL;

-- ============================================================
-- TABLE 2: qurban_shahibul — Pemilik / Peserta Qurban
-- ============================================================
DROP TABLE IF EXISTS qurban_shahibul CASCADE;
CREATE TABLE qurban_shahibul (
  id                    bigserial     PRIMARY KEY,
  qurban_animal_id      bigint        NOT NULL REFERENCES qurban_animals(id) ON DELETE RESTRICT,
  invoice_id            bigint,
  invoice_created_at    timestamptz,
  urutan_peserta        smallint      NOT NULL DEFAULT 1,  -- 1-7 untuk sapi patungan
  nama_shohibul         varchar(200)  NOT NULL,
  atas_nama             varchar(200),  -- qurban atas nama siapa (bisa beda dgn shohibul)
  kontak_shohibul       varchar(20),
  niat                  varchar(300),  -- niat qurban
  sertifikat_url        text,          -- PDF sertifikat qurban
  sertifikat_sent_at    timestamptz,
  created_at            timestamptz   NOT NULL DEFAULT NOW(),
  FOREIGN KEY (invoice_id, invoice_created_at) REFERENCES invoices(id, created_at) ON DELETE SET NULL,
  UNIQUE (qurban_animal_id, urutan_peserta)
);

COMMENT ON TABLE  qurban_shahibul IS '1 baris per peserta qurban per hewan';
COMMENT ON COLUMN qurban_shahibul.atas_nama IS 'Nama almarhumah/orang tua yang diniatkan qurban-nya';

CREATE INDEX idx_shahibul_animal  ON qurban_shahibul (qurban_animal_id);
CREATE INDEX idx_shahibul_invoice ON qurban_shahibul (invoice_id, invoice_created_at) WHERE invoice_id IS NOT NULL;

-- ============================================================
-- TABLE 3: qurban_distributions — Distribusi Daging per Lokasi
-- ============================================================
DROP TABLE IF EXISTS qurban_distributions CASCADE;
CREATE TABLE qurban_distributions (
  id                      bigserial     PRIMARY KEY,
  qurban_animal_id        bigint        NOT NULL REFERENCES qurban_animals(id) ON DELETE RESTRICT,
  disbursement_request_id bigint        REFERENCES disbursement_requests(id) ON DELETE SET NULL,
  lokasi_distribusi       varchar(300)  NOT NULL,
  koordinat_lat           numeric(10,7),
  koordinat_lng           numeric(10,7),
  nama_koordinator        varchar(200),
  kontak_koordinator      varchar(20),
  jumlah_paket            int           NOT NULL CHECK (jumlah_paket > 0),
  berat_per_paket_kg      numeric(5,2),
  total_berat_kg          numeric(8,2),
  tgl_distribusi          date          NOT NULL,
  foto_distribusi_url     text,
  video_distribusi_url    text,
  berita_acara_url        text,
  jumlah_penerima_aktual  int,
  catatan                 text,
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE qurban_distributions IS 'Distribusi daging qurban per lokasi per hewan';

CREATE INDEX idx_qurban_dist_animal  ON qurban_distributions (qurban_animal_id);
CREATE INDEX idx_qurban_dist_tgl     ON qurban_distributions (tgl_distribusi DESC);
CREATE INDEX idx_qurban_dist_disbursement ON qurban_distributions (disbursement_request_id) WHERE disbursement_request_id IS NOT NULL;

-- ============================================================
-- TABLE 4: zakat_distributions — Penyaluran Zakat per Asnaf
-- ============================================================
DROP TABLE IF EXISTS zakat_distributions CASCADE;
CREATE TABLE zakat_distributions (
  id                      bigserial     PRIMARY KEY,
  disbursement_request_id bigint        NOT NULL
    REFERENCES disbursement_requests(id) ON DELETE RESTRICT,
  fins_trans_id_sumber    bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  asnaf                   varchar(20)   NOT NULL
    CHECK (asnaf IN ('fakir','miskin','amil','muallaf','riqab','gharimin','fisabilillah','ibnu_sabil')),
  jumlah_disalurkan       bigint        NOT NULL CHECK (jumlah_disalurkan > 0),
  jumlah_penerima         int,
  tgl_distribusi          date          NOT NULL,
  beneficiary_id          bigint        REFERENCES beneficiaries(id) ON DELETE SET NULL,
  lokasi_distribusi       varchar(300),
  keterangan              text,
  bukti_url               text,
  created_at              timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  zakat_distributions IS 'Penyaluran zakat ke 8 golongan asnaf penerima';
COMMENT ON COLUMN zakat_distributions.asnaf IS 'Salah satu dari 8 asnaf: fakir, miskin, amil, muallaf, riqab, gharimin, fisabilillah, ibnu_sabil';
COMMENT ON COLUMN zakat_distributions.fins_trans_id_sumber IS 'fins_trans penerimaan zakat yang jadi sumbernya';

CREATE INDEX idx_zakat_dist_disbursement ON zakat_distributions (disbursement_request_id);
CREATE INDEX idx_zakat_dist_asnaf        ON zakat_distributions (asnaf);
CREATE INDEX idx_zakat_dist_tgl          ON zakat_distributions (tgl_distribusi DESC);
CREATE INDEX idx_zakat_dist_beneficiary  ON zakat_distributions (beneficiary_id) WHERE beneficiary_id IS NOT NULL;

-- ============================================================
-- TABLE 5: zakat_amil_fee — Bagian Hak Amil (12.5% dari Zakat)
-- Diakui tiap bulan atau tiap periode penerimaan zakat
-- ============================================================
DROP TABLE IF EXISTS zakat_amil_fee CASCADE;
CREATE TABLE zakat_amil_fee (
  id                      bigserial     PRIMARY KEY,
  periode_bulan           smallint      NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun           smallint      NOT NULL,
  total_zakat_diterima    bigint        NOT NULL CHECK (total_zakat_diterima > 0),
  persentase_amil         numeric(5,2)  NOT NULL DEFAULT 12.50,
  jumlah_amil             bigint        GENERATED ALWAYS AS
    (ROUND(total_zakat_diterima * persentase_amil / 100)::bigint) STORED,
  jumlah_disalurkan       bigint        NOT NULL DEFAULT 0,
  sisa_amil               bigint        GENERATED ALWAYS AS
    (ROUND(total_zakat_diterima * persentase_amil / 100) - jumlah_disalurkan) STORED,
  fins_trans_id_pengakuan bigint        REFERENCES fins_trans(id) ON DELETE SET NULL,
  fins_trans_id_penyaluran bigint       REFERENCES fins_trans(id) ON DELETE SET NULL,
  status                  varchar(15)   NOT NULL DEFAULT 'calculated'
    CHECK (status IN ('calculated','approved','disbursed')),
  catatan                 text,
  created_at              timestamptz   NOT NULL DEFAULT NOW(),
  updated_at              timestamptz   NOT NULL DEFAULT NOW(),
  UNIQUE (periode_bulan, periode_tahun)
);

COMMENT ON TABLE  zakat_amil_fee IS 'Hak bagian amil (12.5%) dari total zakat yang diterima per periode';
COMMENT ON COLUMN zakat_amil_fee.jumlah_amil IS 'Generated: total_zakat × persentase/100 (otomatis)';
COMMENT ON COLUMN zakat_amil_fee.fins_trans_id_pengakuan IS 'Debet 201.06 (kewajiban amil), Kredit 401.10 (pengakuan)';
COMMENT ON COLUMN zakat_amil_fee.fins_trans_id_penyaluran IS 'Debet 201.06, Kredit 101.xx (bayar ke amil)';

CREATE INDEX idx_zakat_amil_periode ON zakat_amil_fee (periode_tahun DESC, periode_bulan DESC);
CREATE INDEX idx_zakat_amil_status  ON zakat_amil_fee (status);
