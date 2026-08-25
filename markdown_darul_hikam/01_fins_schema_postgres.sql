-- ============================================================
-- FINS PostgreSQL Schema
-- Converted from: zains_csf MySQL (fins_*)
-- Rules:
--   - bigserial PKs (no uuid), natural PKs kept where meaningful
--   - varchar + CHECK instead of enum
--   - No log triggers (removed per spec)
--   - Business triggers moved to 03_fins_triggers.md (Upstash)
--   - Optimized indexes for high-traffic read/write
--   - FK to crowdfunding schema included in 02_fins_crowdfunding_integration.sql
-- ============================================================

-- ============================================================
-- TABLE 1: fins_bank
-- Master data bank (natural PK: kode bank 3-5 char)
-- ============================================================
DROP TABLE IF EXISTS fins_bank CASCADE;
CREATE TABLE fins_bank (
  id_bank          varchar(5)   NOT NULL,
  bank             varchar(50)  NOT NULL,
  description_code text         NOT NULL DEFAULT '',
  dtu              timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_bank)
);

COMMENT ON TABLE  fins_bank                 IS 'Master data bank';
COMMENT ON COLUMN fins_bank.id_bank         IS 'Kode bank (e.g. 014=BCA, 008=Mandiri, XND=Xendit)';
COMMENT ON COLUMN fins_bank.description_code IS 'Description/mutation code format';

CREATE INDEX idx_fins_bank_dtu ON fins_bank (dtu DESC);

-- ============================================================
-- TABLE 2: fins_bank_rek
-- Rekening bank aktif milik organisasi (natural PK: no rekening)
-- ============================================================
DROP TABLE IF EXISTS fins_bank_rek CASCADE;
CREATE TABLE fins_bank_rek (
  id_rekening  varchar(50)  NOT NULL,
  id_bank      varchar(5)   NOT NULL,
  keterangan   varchar(100) NOT NULL,
  coa          varchar(15)  NOT NULL,
  active       varchar(1)   NOT NULL DEFAULT 'y' CHECK (active IN ('y','n')),
  scrap        varchar(1)   NOT NULL DEFAULT 'n' CHECK (scrap IN ('n','y')),
  note         text         NOT NULL DEFAULT '',
  dtu          timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_rekening),
  FOREIGN KEY (id_bank) REFERENCES fins_bank(id_bank) ON DELETE RESTRICT
);

COMMENT ON TABLE  fins_bank_rek              IS 'Rekening bank & payment channel milik organisasi';
COMMENT ON COLUMN fins_bank_rek.id_rekening  IS 'Nomor rekening atau identifier channel pembayaran';
COMMENT ON COLUMN fins_bank_rek.coa          IS 'COA yang mewakili rekening ini di Chart of Accounts';

CREATE INDEX idx_fins_bank_rek_bank   ON fins_bank_rek (id_bank);
CREATE INDEX idx_fins_bank_rek_coa    ON fins_bank_rek (coa);
CREATE INDEX idx_fins_bank_rek_active ON fins_bank_rek (active) WHERE active = 'y';

-- ============================================================
-- TABLE 3: fins_coa
-- Chart of Accounts (natural PK: kode COA, e.g. '101.02.001.000')
-- ============================================================
DROP TABLE IF EXISTS fins_coa CASCADE;
CREATE TABLE fins_coa (
  coa          varchar(14)  NOT NULL,
  nama_coa     varchar(200) NOT NULL,
  coa_parent   varchar(50)  NOT NULL DEFAULT '',
  level        smallint     NOT NULL DEFAULT 1,
  id_kantor    text         NOT NULL DEFAULT '',
  id_jabatan   text         NOT NULL DEFAULT '',
  group_coa    text         NOT NULL DEFAULT '',    -- renamed: `group` is reserved in PG
  parent       varchar(1)   NOT NULL DEFAULT 'y'   CHECK (parent     IN ('y','n')),
  tgl_update   timestamptz  NOT NULL DEFAULT NOW(),
  active       varchar(1)   NOT NULL DEFAULT 'y'   CHECK (active     IN ('n','y','h')),
  is_default   varchar(1)   NOT NULL DEFAULT 'y'   CHECK (is_default IN ('y','n')),
  saldo        varchar(1)   NOT NULL               CHECK (saldo      IN ('d','k')),
  keterangan   varchar(100) NOT NULL DEFAULT '',
  note         text         NOT NULL DEFAULT '',
  dtu          timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coa)
);

COMMENT ON TABLE  fins_coa             IS 'Chart of Accounts (COA) - hierarki akun akuntansi';
COMMENT ON COLUMN fins_coa.saldo       IS 'd=Debet normal, k=Kredit normal';
COMMENT ON COLUMN fins_coa.active      IS 'y=aktif, n=nonaktif, h=hidden';
COMMENT ON COLUMN fins_coa.parent      IS 'y=akun induk (tidak bisa dipakai di jurnal), n=leaf';
COMMENT ON COLUMN fins_coa.group_coa   IS 'ID grup laporan (comma-separated)';

CREATE INDEX idx_fins_coa_parent   ON fins_coa (coa_parent);
CREATE INDEX idx_fins_coa_level    ON fins_coa (level);
CREATE INDEX idx_fins_coa_active   ON fins_coa (active) WHERE active = 'y';
CREATE INDEX idx_fins_coa_saldo    ON fins_coa (saldo);
CREATE INDEX idx_fins_coa_dtu      ON fins_coa (dtu DESC);

-- ============================================================
-- TABLE 4: fins_saldo_dana
-- Mapping dana/fund ke COA penerimaan dan pengeluaran
-- (natural PK: coa_dana, reference to fins_coa)
-- ============================================================
DROP TABLE IF EXISTS fins_saldo_dana CASCADE;
CREATE TABLE fins_saldo_dana (
  coa_dana    varchar(15)  NOT NULL,
  coa_expend  text         NOT NULL DEFAULT '',   -- CSV list of pengeluaran COA
  coa_receipt text         NOT NULL DEFAULT '',   -- CSV list of penerimaan COA
  ops         varchar(1)   NOT NULL DEFAULT 'n'   CHECK (ops IN ('y','n')),
  dtu         timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coa_dana),
  FOREIGN KEY (coa_dana) REFERENCES fins_coa(coa) ON DELETE RESTRICT
);

COMMENT ON TABLE  fins_saldo_dana          IS 'Pemetaan dana ekuitas ke COA penerimaan/pengeluaran';
COMMENT ON COLUMN fins_saldo_dana.coa_dana IS 'COA dana/ekuitas (level 300.xx)';
COMMENT ON COLUMN fins_saldo_dana.ops      IS 'y=dana operasional';

-- ============================================================
-- TABLE 5: fins_aset
-- Manajemen aset tetap organisasi (bigserial PK)
-- ============================================================
DROP TABLE IF EXISTS fins_aset CASCADE;
CREATE TABLE fins_aset (
  id                  bigserial    PRIMARY KEY,
  kode_aset           varchar(20)  NOT NULL,
  aset                varchar(100) NOT NULL,
  coa                 varchar(30)  NOT NULL,
  deskripsi           text,
  tgl_akuisisi        timestamptz  NOT NULL,
  biaya_akuisisi      bigint       NOT NULL CHECK (biaya_akuisisi >= 0),
  id_kantor           int,
  metode              varchar(50),
  masa_manfaat        int          NOT NULL CHECK (masa_manfaat > 0),
  tgl_akhir_manfaat   timestamptz  NOT NULL,
  persentase_susut    numeric(11,2),
  coa_debit           varchar(30),
  coa_kredit          varchar(30),
  susut_terakhir      numeric(11,2),
  tgl_susut_lanjutan  timestamptz,
  dtu                 timestamptz  DEFAULT NOW(),
  deleted             varchar(1)   NOT NULL DEFAULT 'n' CHECK (deleted IN ('n','y')),
  user_update         varchar(30),
  note                text,
  UNIQUE (kode_aset)
);

COMMENT ON TABLE  fins_aset              IS 'Aset tetap organisasi dengan penyusutan';
COMMENT ON COLUMN fins_aset.metode       IS 'Metode penyusutan: Garis Lurus, Saldo Menurun, dll';
COMMENT ON COLUMN fins_aset.masa_manfaat IS 'Umur ekonomis dalam bulan';

CREATE INDEX idx_fins_aset_deleted ON fins_aset (deleted) WHERE deleted = 'n';
CREATE INDEX idx_fins_aset_coa     ON fins_aset (coa);
CREATE INDEX idx_fins_aset_kantor  ON fins_aset (id_kantor);
CREATE INDEX idx_fins_aset_dtu     ON fins_aset (dtu DESC);

-- ============================================================
-- TABLE 6: fins_budget
-- Anggaran per COA per periode (bigserial PK)
-- FK ke campaigns ditambah untuk crowdfunding mapping
-- ============================================================
DROP TABLE IF EXISTS fins_budget CASCADE;
CREATE TABLE fins_budget (
  id           bigserial     PRIMARY KEY,
  tanggal      date          NOT NULL,
  coa          varchar(15)   NOT NULL,
  budget       numeric(20,2) NOT NULL DEFAULT 0,
  relocation   numeric(20,2) NOT NULL DEFAULT 0,
  additional   numeric(20,2) NOT NULL DEFAULT 0,
  saldo_akhir  numeric(20,2) NOT NULL DEFAULT 0,
  nik_input    varchar(20)   NOT NULL DEFAULT '',
  nik_approve  varchar(20)   NOT NULL DEFAULT '',
  id_kantor    int           NOT NULL DEFAULT 0,
  id_jabatan   int           NOT NULL DEFAULT 0,
  id_program   int           NOT NULL DEFAULT 0,
  id_contact   varchar(20)   NOT NULL DEFAULT '',
  approve      varchar(1)    NOT NULL DEFAULT 'u' CHECK (approve IN ('u','r','a')),
  updated      timestamptz   NOT NULL DEFAULT NOW(),
  keterangan   varchar(100)  NOT NULL DEFAULT '',
  dtu          timestamptz   NOT NULL DEFAULT NOW(),
  -- FK crowdfunding ditambahkan post-seed: lihat 05_fins_deferred_fk.sql
  campaign_id  bigint
);

COMMENT ON TABLE  fins_budget             IS 'Anggaran per COA per periode';
COMMENT ON COLUMN fins_budget.approve     IS 'u=unreviewed, r=rejected, a=approved';
COMMENT ON COLUMN fins_budget.campaign_id IS '[FK crowdfunding] Campaign terkait anggaran ini';

CREATE INDEX idx_fins_budget_coa       ON fins_budget (coa);
CREATE INDEX idx_fins_budget_tanggal   ON fins_budget (tanggal DESC);
CREATE INDEX idx_fins_budget_kantor    ON fins_budget (id_kantor);
CREATE INDEX idx_fins_budget_approve   ON fins_budget (approve);
CREATE INDEX idx_fins_budget_campaign  ON fins_budget (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_fins_budget_program   ON fins_budget (id_program);

-- ============================================================
-- TABLE 7: fins_trans
-- Transaksi keuangan utama (bigserial PK + id_trans code UNIQUE)
-- id_trans: generated code YYMMDDHHMMSS+6random (18-20 chars)
-- FK ke crowdfunding invoices ditambah
-- ============================================================
DROP TABLE IF EXISTS fins_trans CASCADE;
CREATE TABLE fins_trans (
  id                           bigserial     PRIMARY KEY,
  id_trans                     varchar(20)   NOT NULL,    -- generated business code
  id_transaksi                 varchar(30)   NOT NULL DEFAULT '',
  id_exre                      varchar(20)   NOT NULL DEFAULT '',
  coa_ca                       varchar(14)   NOT NULL DEFAULT '',
  coa_debet                    varchar(14)   NOT NULL DEFAULT '',
  coa_kredit                   varchar(14)   NOT NULL DEFAULT '',
  nominal                      numeric(20,2) NOT NULL CHECK (nominal > 0),
  keterangan                   varchar(500)  NOT NULL DEFAULT '',
  nik_input                    varchar(20)   NOT NULL DEFAULT '',
  nik_input_atasan             varchar(15)   NOT NULL DEFAULT '',
  tgl_exre                     timestamptz   NOT NULL,
  fdt                          timestamptz   NOT NULL DEFAULT NOW(),
  realisasi                    numeric(20,2) NOT NULL DEFAULT 0,
  coa                          varchar(14)   NOT NULL DEFAULT '',
  nik_approve                  varchar(15)   NOT NULL DEFAULT '',
  id_kantor                    int           NOT NULL DEFAULT 1,
  id_via_bayar                 int           NOT NULL DEFAULT 2,
  approve                      varchar(3)    NOT NULL DEFAULT 'u'
                                   CHECK (approve IN ('a','r','u','as','rs','us','aj','asj','ac','hc')),
  jenis                        varchar(1)    NOT NULL
                                   CHECK (jenis IN ('r','e')),
  mutasi                       varchar(2)    NOT NULL DEFAULT '',
  nik_cair                     varchar(15)   NOT NULL DEFAULT '',
  id_program                   int           NOT NULL DEFAULT 0,
  id_contact                   varchar(20)   NOT NULL DEFAULT '',
  noresi                       varchar(16)   NOT NULL DEFAULT '',
  total                        numeric(20,2) NOT NULL DEFAULT 0,
  quantity                     int           NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  id_jabatan                   int           NOT NULL DEFAULT 0,
  kinerja                      varchar(10)   NOT NULL DEFAULT 'Komersil'
                                   CHECK (kinerja IN ('Kinerja','Komersil')),
  note                         text          NOT NULL DEFAULT '',
  dtu                          timestamptz   NOT NULL DEFAULT NOW(),
  -- FK crowdfunding ditambahkan post-seed: lihat 05_fins_deferred_fk.sql
  crowdfunding_invoice_id         bigint,
  crowdfunding_invoice_created_at timestamptz,
  UNIQUE (id_trans)
);

COMMENT ON TABLE  fins_trans                          IS 'Transaksi keuangan utama FINS';
COMMENT ON COLUMN fins_trans.id_trans                 IS 'Business code: YYMMDDHHmmss + 6 random digits';
COMMENT ON COLUMN fins_trans.jenis                    IS 'r=penerimaan (revenue), e=pengeluaran (expense)';
COMMENT ON COLUMN fins_trans.mutasi                   IS '1=kas masuk, 2=bank masuk, 3=manual TF, 4=QRIS, 6=retail, 10=lainnya, e=ewallet, r=reject';
COMMENT ON COLUMN fins_trans.approve                  IS 'u=pending, a=approved, r=rejected, as=approve supervisor, aj=approve jurnal, ac=approve cancel, hc=hold cancel';
COMMENT ON COLUMN fins_trans.kinerja                  IS 'Kinerja=program kinerja, Komersil=komersil/operasional';
COMMENT ON COLUMN fins_trans.crowdfunding_invoice_id  IS '[FK crowdfunding] Invoice donasi yang memicu transaksi ini';

CREATE INDEX idx_fins_trans_id_trans       ON fins_trans (id_trans);
CREATE INDEX idx_fins_trans_id_transaksi   ON fins_trans (id_transaksi);
CREATE INDEX idx_fins_trans_id_exre        ON fins_trans (id_exre);
CREATE INDEX idx_fins_trans_tgl_exre       ON fins_trans (tgl_exre DESC);
CREATE INDEX idx_fins_trans_noresi         ON fins_trans (noresi) WHERE noresi != '';
CREATE INDEX idx_fins_trans_approve        ON fins_trans (approve);
CREATE INDEX idx_fins_trans_approve_active ON fins_trans (approve, tgl_exre DESC)
  WHERE approve IN ('a','as','aj','asj','ac');
CREATE INDEX idx_fins_trans_kantor         ON fins_trans (id_kantor);
CREATE INDEX idx_fins_trans_mutasi         ON fins_trans (mutasi);
CREATE INDEX idx_fins_trans_jenis          ON fins_trans (jenis);
CREATE INDEX idx_fins_trans_coa_debet      ON fins_trans (coa_debet);
CREATE INDEX idx_fins_trans_coa_kredit     ON fins_trans (coa_kredit);
CREATE INDEX idx_fins_trans_invoice        ON fins_trans (crowdfunding_invoice_id, crowdfunding_invoice_created_at)
  WHERE crowdfunding_invoice_id IS NOT NULL;
CREATE INDEX idx_fins_trans_dtu            ON fins_trans (dtu DESC);

-- ============================================================
-- TABLE 8: fins_jurnal
-- Jurnal entri double-entry (bigserial PK + id_jurnal UNIQUE)
-- id_jurnal = id_trans + '1' (debet) atau + '2' (kredit)
-- ============================================================
DROP TABLE IF EXISTS fins_jurnal CASCADE;
CREATE TABLE fins_jurnal (
  id           bigserial     PRIMARY KEY,
  id_jurnal    varchar(22)   NOT NULL,    -- id_trans(20) + '1'/'2' = max 21
  id_transaksi varchar(30)   NOT NULL DEFAULT '',
  id_exre      varchar(20)   NOT NULL DEFAULT '',
  coa          varchar(14)   NOT NULL,
  debet        numeric(20,2) NOT NULL DEFAULT 0 CHECK (debet >= 0),
  kredit       numeric(20,2) NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  keterangan   varchar(200)  NOT NULL DEFAULT '',
  nik_input    varchar(20)   NOT NULL DEFAULT '',
  tgl_exre     date          NOT NULL,
  id_kantor    int           NOT NULL DEFAULT 1,
  id_via_bayar smallint      NOT NULL DEFAULT 2,
  jenis        varchar(1)    NOT NULL CHECK (jenis IN ('r','e')),
  via_jurnal   smallint      NOT NULL DEFAULT 0,
  id_trans     varchar(20)   NOT NULL DEFAULT '',   -- reference to fins_trans.id_trans
  note         text          NOT NULL DEFAULT '',
  fdt          timestamptz   NOT NULL DEFAULT NOW(),
  coa_buku     varchar(14)   NOT NULL DEFAULT '',
  noresi       varchar(16)   NOT NULL DEFAULT '',
  id_program   int           NOT NULL DEFAULT 0,
  kinerja      varchar(10)   NOT NULL DEFAULT 'Komersil' CHECK (kinerja IN ('Kinerja','Komersil')),
  dtu          timestamptz   NOT NULL DEFAULT NOW(),
  -- FK ke fins_trans (bigserial) untuk referensi relasional
  fins_trans_id bigint       REFERENCES fins_trans(id) ON DELETE CASCADE,
  UNIQUE (id_jurnal),
  -- Constraint: setiap baris harus debet XOR kredit (tidak boleh keduanya nol atau keduanya isi)
  CONSTRAINT chk_debet_or_kredit CHECK (
    (debet > 0 AND kredit = 0) OR (debet = 0 AND kredit > 0)
  )
);

COMMENT ON TABLE  fins_jurnal              IS 'Jurnal double-entry per transaksi fins_trans';
COMMENT ON COLUMN fins_jurnal.id_jurnal    IS 'id_trans + 1 (debet entry) atau + 2 (kredit entry)';
COMMENT ON COLUMN fins_jurnal.jenis        IS 'r=penerimaan (debet), e=pengeluaran (kredit)';
COMMENT ON COLUMN fins_jurnal.via_jurnal   IS '1=bank TF, 2=ewallet, 3=kas/lain';
COMMENT ON COLUMN fins_jurnal.coa_buku     IS 'COA pasangan (lawan) untuk buku besar';

CREATE INDEX idx_fins_jurnal_id_trans     ON fins_jurnal (id_trans);
CREATE INDEX idx_fins_jurnal_id_jurnal    ON fins_jurnal (id_jurnal);
CREATE INDEX idx_fins_jurnal_id_transaksi ON fins_jurnal (id_transaksi);
CREATE INDEX idx_fins_jurnal_tgl_exre     ON fins_jurnal (tgl_exre DESC);
CREATE INDEX idx_fins_jurnal_id_exre      ON fins_jurnal (id_exre);
CREATE INDEX idx_fins_jurnal_coa          ON fins_jurnal (coa);
CREATE INDEX idx_fins_jurnal_via_jurnal   ON fins_jurnal (via_jurnal);
CREATE INDEX idx_fins_jurnal_jenis        ON fins_jurnal (jenis);
CREATE INDEX idx_fins_jurnal_fins_trans   ON fins_jurnal (fins_trans_id);
CREATE INDEX idx_fins_jurnal_dtu          ON fins_jurnal (dtu DESC);
-- High-traffic: laporan buku besar per COA per periode
CREATE INDEX idx_fins_jurnal_coa_tgl      ON fins_jurnal (coa, tgl_exre DESC);
CREATE INDEX idx_fins_jurnal_kantor_tgl   ON fins_jurnal (id_kantor, tgl_exre DESC);

-- ============================================================
-- TABLE 9: fins_opname
-- Rekonsiliasi saldo kas/bank per periode
-- (composite natural PK: tanggal + coa + id_kantor + per + via)
-- ============================================================
DROP TABLE IF EXISTS fins_opname CASCADE;
CREATE TABLE fins_opname (
  tanggal             date          NOT NULL,
  coa                 varchar(15)   NOT NULL,
  saldo_awal          numeric(20,2) NOT NULL DEFAULT 0,
  saldo_awal_kinerja  numeric(20,2),
  debet               numeric(20,2) NOT NULL DEFAULT 0,
  kredit              numeric(20,2) NOT NULL DEFAULT 0,
  adjustment          numeric(20,2) NOT NULL DEFAULT 0,
  saldo_akhir         numeric(20,2) NOT NULL DEFAULT 0,
  saldo_akhir_kinerja numeric(20,2),
  detail_kertas       text          NOT NULL DEFAULT '',
  detail_logam        text          NOT NULL DEFAULT '',
  nik_input           varchar(20)   NOT NULL DEFAULT '',
  id_kantor           int           NOT NULL DEFAULT 0,
  id_via_bayar        varchar(1)    NOT NULL DEFAULT '0' CHECK (id_via_bayar IN ('1','2','0')),
  active              varchar(1)    NOT NULL DEFAULT 'y'  CHECK (active IN ('y','n')),
  updated             timestamptz   NOT NULL DEFAULT NOW(),
  per                 varchar(1)    NOT NULL DEFAULT 'd'  CHECK (per IN ('y','m','d')),
  keterangan          varchar(100)  NOT NULL DEFAULT '',
  via                 varchar(6)    NOT NULL DEFAULT 'coa'
                          CHECK (via IN ('coa','user','rekon1','rekon2')),
  dtu                 timestamptz   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tanggal, coa, id_kantor, per, via)
);

COMMENT ON TABLE  fins_opname          IS 'Rekonsiliasi saldo kas/bank per periode (opname)';
COMMENT ON COLUMN fins_opname.per      IS 'd=daily, m=monthly, y=yearly';
COMMENT ON COLUMN fins_opname.via      IS 'coa=dari jurnal, user=manual, rekon1/rekon2=rekonsiliasi bank';

CREATE INDEX idx_fins_opname_coa      ON fins_opname (coa);
CREATE INDEX idx_fins_opname_tanggal  ON fins_opname (tanggal DESC);
CREATE INDEX idx_fins_opname_kantor   ON fins_opname (id_kantor);
CREATE INDEX idx_fins_opname_active   ON fins_opname (active) WHERE active = 'y';
CREATE INDEX idx_fins_opname_dtu      ON fins_opname (dtu DESC);
-- High-traffic: closing balance query per COA per month
CREATE INDEX idx_fins_opname_coa_tgl_per ON fins_opname (coa, tanggal DESC, per);

-- ============================================================
-- TABLE 10: fins_report
-- Struktur baris laporan keuangan (bigserial PK)
-- ============================================================
DROP TABLE IF EXISTS fins_report CASCADE;
CREATE TABLE fins_report (
  id          bigserial     PRIMARY KEY,
  nama_coa    varchar(100)  NOT NULL,
  level       smallint      NOT NULL,
  coa         text          NOT NULL DEFAULT '',
  report      varchar(20)   NOT NULL,
  active      varchar(1)    NOT NULL DEFAULT 'y' CHECK (active IN ('y','n')),
  sort        int           NOT NULL DEFAULT 0,
  keterangan  varchar(200)  NOT NULL DEFAULT '',
  kode        varchar(5)    NOT NULL DEFAULT '',
  dtu         timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  fins_report        IS 'Struktur baris laporan keuangan (formula per baris)';
COMMENT ON COLUMN fins_report.report IS 'Kode laporan: LPK=Posisi Keuangan, LPO=Penerimaan/Pengeluaran, LAK=Arus Kas, LPD=Penerimaan Donasi';
COMMENT ON COLUMN fins_report.coa    IS 'Rumus/referensi COA untuk baris ini';
COMMENT ON COLUMN fins_report.level  IS '1=header tebal, 2=sub-header, 3=akun leaf, 4=total';

CREATE INDEX idx_fins_report_sort   ON fins_report (sort);
CREATE INDEX idx_fins_report_report ON fins_report (report, sort);
CREATE INDEX idx_fins_report_active ON fins_report (active) WHERE active = 'y';

-- ============================================================
-- TABLE 11: fins_upstash_events
-- Store untuk Upstash Workflow events dan Cron schedule
-- Menggantikan thisyear trigger + log trigger dari MySQL
-- ============================================================
DROP TABLE IF EXISTS fins_upstash_events CASCADE;
CREATE TABLE fins_upstash_events (
  id               bigserial    PRIMARY KEY,
  event_type       varchar(100) NOT NULL,
  entity_type      varchar(50)  NOT NULL,
  entity_id        bigint,
  entity_ref       varchar(100),
  payload          jsonb        NOT NULL DEFAULT '{}',
  workflow_run_id  varchar(255),
  workflow_url     varchar(500),
  status           varchar(15)  NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','PROCESSING','SUCCESS','FAILED','RETRYING','SKIPPED')),
  scheduled_at     timestamptz,
  processed_at     timestamptz,
  error_message    text,
  retry_count      int          NOT NULL DEFAULT 0,
  max_retries      int          NOT NULL DEFAULT 3,
  created_at       timestamptz  NOT NULL DEFAULT NOW(),
  updated_at       timestamptz  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  fins_upstash_events              IS 'Event store untuk Upstash Workflow dan Cron scheduling';
COMMENT ON COLUMN fins_upstash_events.event_type   IS 'INVOICE_PAID, FINS_TRANS_CREATE_JURNAL, FINS_TRANS_UPDATE_JURNAL, FINS_TRANS_DELETE_JURNAL, OPNAME_DAILY_CLOSE, OPNAME_MONTHLY_CLOSE, OPNAME_YEARLY_CLOSE, JURNAL_THISYEAR_CLEANUP';
COMMENT ON COLUMN fins_upstash_events.entity_type  IS 'invoice, fins_trans, fins_jurnal, campaign, opname';
COMMENT ON COLUMN fins_upstash_events.entity_id    IS 'bigserial ID dari entitas terkait';
COMMENT ON COLUMN fins_upstash_events.entity_ref   IS 'Business code: invoice_code, id_trans, id_jurnal, dll';
COMMENT ON COLUMN fins_upstash_events.payload      IS 'Full event payload untuk diproses workflow';
COMMENT ON COLUMN fins_upstash_events.workflow_run_id IS 'Upstash Workflow run ID untuk tracking';

-- High-traffic indexes
CREATE INDEX idx_upstash_events_pending     ON fins_upstash_events (status, scheduled_at)
  WHERE status IN ('PENDING','RETRYING');
CREATE INDEX idx_upstash_events_entity      ON fins_upstash_events (entity_type, entity_id);
CREATE INDEX idx_upstash_events_entity_ref  ON fins_upstash_events (entity_ref) WHERE entity_ref IS NOT NULL;
CREATE INDEX idx_upstash_events_event_type  ON fins_upstash_events (event_type);
CREATE INDEX idx_upstash_events_scheduled   ON fins_upstash_events (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'PENDING';
CREATE INDEX idx_upstash_events_workflow    ON fins_upstash_events (workflow_run_id)
  WHERE workflow_run_id IS NOT NULL;
CREATE INDEX idx_upstash_events_created     ON fins_upstash_events (created_at DESC);
