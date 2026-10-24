-- Migration 24: fins_pertanggungjawaban table
-- Pertanggungjawaban Cash Advance module

CREATE TABLE IF NOT EXISTS fins_pertanggungjawaban (
  id             bigserial PRIMARY KEY,
  id_buku        varchar(30)    NOT NULL,
  tanggal        date           NOT NULL,
  nama_akun      varchar(200)   NOT NULL DEFAULT '',
  keterangan     text           NOT NULL DEFAULT '',
  quantity       int            NOT NULL DEFAULT 1,
  nominal        numeric(20,2)  NOT NULL CHECK (nominal > 0),
  user_input     varchar(150)   NOT NULL DEFAULT '',
  user_approve   varchar(150)   NOT NULL DEFAULT '',
  approve        varchar(10)    NOT NULL DEFAULT 'us'
                                CHECK (approve IN ('us','as','rs')),
  office_id      int            REFERENCES fins_kantor(id) ON DELETE SET NULL,
  coa_debet      varchar(20)    NOT NULL DEFAULT '',
  coa_kredit     varchar(20)    NOT NULL DEFAULT '',
  nama_akun_kredit varchar(200) NOT NULL DEFAULT '',
  no_resi        varchar(50)    NOT NULL DEFAULT '',
  referensi      varchar(200)   NOT NULL DEFAULT '',
  created_at     timestamptz    NOT NULL DEFAULT NOW(),
  updated_at     timestamptz    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pertanggungjawaban_id_buku ON fins_pertanggungjawaban (id_buku);
CREATE INDEX IF NOT EXISTS idx_pertanggungjawaban_tanggal    ON fins_pertanggungjawaban (tanggal);
CREATE INDEX IF NOT EXISTS idx_pertanggungjawaban_approve    ON fins_pertanggungjawaban (approve);
CREATE INDEX IF NOT EXISTS idx_pertanggungjawaban_office     ON fins_pertanggungjawaban (office_id);
