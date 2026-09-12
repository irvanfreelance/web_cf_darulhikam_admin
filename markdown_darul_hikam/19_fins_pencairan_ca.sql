-- ============================================================================
-- 19_fins_pencairan_ca.sql
-- FINS > Home > Pencairan (disbursement) — the next stage of the Pengajuan CA
-- lifecycle (file 18_fins_ca_pengajuan.sql). Rather than adding a parallel
-- status column, `fins_ca_pengajuan.status` is renamed to `approve` and
-- reuses the same code vocabulary already reserved (unused) on the base
-- `fins_trans.approve` column (01_fins_schema_postgres.sql):
--
--   u   = unapprove              (pencairan belum diproses)
--   a   = approve                (pencairan disetujui / dicairkan)
--   r   = reject                 (pencairan ditolak)
--   as  = approve submission     (pengajuan CA disetujui)
--   rs  = reject submission      (pengajuan CA ditolak)
--   us  = unapprove submission   (pengajuan CA belum diproses)
--   aj  = pengembalian CA                    -- reserved, future Pertanggungjawaban
--   asj = approve submission pertanggungjawaban -- reserved
--   ac  = rekonsiliasi perusahaan             -- reserved
--   hc  = rekonsiliasi bank                   -- reserved
--
-- State machine:
--   us (default) --approve--> as --[Buat Pencairan: Save]--> a
--         \--reject--> rs             \--[Buat Pencairan: Reject]--> r
--
-- Also adds disbursement detail columns, populated only once a row reaches
-- Pencairan (No Resi, Via Bayar, Bank/rekening, Tag, Referensi/Mitra,
-- Pencair, Tanggal Cair).
--
-- Safe to re-run: guards with IF EXISTS / conditional data migration.
-- Applied to the live Neon DB via a one-off transactional script on
-- 2026-09-12 (7 existing rows migrated: unapprove->us, approved->as,
-- rejected->rs, no data loss).
-- ============================================================================

ALTER TABLE fins_ca_pengajuan RENAME COLUMN status TO approve;
ALTER TABLE fins_ca_pengajuan ALTER COLUMN approve SET DEFAULT 'us';
ALTER TABLE fins_ca_pengajuan DROP CONSTRAINT IF EXISTS fins_ca_pengajuan_status_check;

UPDATE fins_ca_pengajuan SET approve = 'us' WHERE approve = 'unapprove';
UPDATE fins_ca_pengajuan SET approve = 'as' WHERE approve = 'approved';
UPDATE fins_ca_pengajuan SET approve = 'rs' WHERE approve = 'rejected';

ALTER TABLE fins_ca_pengajuan
  ADD CONSTRAINT fins_ca_pengajuan_approve_check
    CHECK (approve IN ('a','r','u','as','rs','us','aj','asj','ac','hc'));

ALTER TABLE fins_ca_pengajuan
  ADD COLUMN IF NOT EXISTS no_resi         varchar(20)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS via_bayar       varchar(10)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_rek_id     varchar(50),
  ADD COLUMN IF NOT EXISTS tag             varchar(10)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referensi_mitra varchar(200) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pencair         varchar(150) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tanggal_cair    date;

ALTER TABLE fins_ca_pengajuan
  ADD CONSTRAINT fins_ca_pengajuan_via_bayar_check CHECK (via_bayar IN ('','bank','cash'));
ALTER TABLE fins_ca_pengajuan
  ADD CONSTRAINT fins_ca_pengajuan_tag_check CHECK (tag IN ('','internal','external'));
ALTER TABLE fins_ca_pengajuan
  ADD CONSTRAINT fk_ca_pengajuan_bank_rek FOREIGN KEY (bank_rek_id)
    REFERENCES fins_bank_rek(id_rekening) ON DELETE SET NULL;

COMMENT ON COLUMN fins_ca_pengajuan.approve         IS 'Kode status gabungan pengajuan+pencairan, lihat header file ini';
COMMENT ON COLUMN fins_ca_pengajuan.no_resi         IS 'Nomor resi pencairan, digenerate saat modal Pencairan dibuka';
COMMENT ON COLUMN fins_ca_pengajuan.via_bayar       IS 'bank|cash — cara pencairan';
COMMENT ON COLUMN fins_ca_pengajuan.bank_rek_id     IS 'FK fins_bank_rek.id_rekening — rekening bank pencairan (jika via_bayar=bank)';
COMMENT ON COLUMN fins_ca_pengajuan.tag             IS 'internal|external — kategori penerima pencairan';
COMMENT ON COLUMN fins_ca_pengajuan.referensi_mitra IS 'Referensi/mitra bebas terkait pencairan';
COMMENT ON COLUMN fins_ca_pengajuan.pencair         IS 'Nama user yang mencairkan/menolak pencairan';
COMMENT ON COLUMN fins_ca_pengajuan.tanggal_cair    IS 'Tanggal eksekusi pencairan';

DROP INDEX IF EXISTS idx_ca_pengajuan_status;
CREATE INDEX IF NOT EXISTS idx_ca_pengajuan_approve ON fins_ca_pengajuan (approve);
