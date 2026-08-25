-- ============================================================
-- FINS Deferred FK Constraints + Verifikasi Integritas
-- Dijalankan TERAKHIR setelah semua seed data selesai.
--
-- PRASYARAT (semua harus sudah berjalan):
--   ✅  crowdfunding schema + seed
--   ✅  01_fins_schema_postgres.sql
--   ✅  02_fins_crowdfunding_integration.sql
--   ✅  04_fins_seed_aligned.sql
--
-- Mengapa FK dipisah ke file ini?
--   Beberapa constraint lintas-skema memerlukan data seed sudah
--   ada agar validasi nilai existing tidak gagal saat ALTER TABLE.
--   Contoh: payment_methods.fins_coa_debet sudah berisi value
--   '101.02.005.000' (dari UPDATE di file 04 section 7). FK baru
--   ke fins_coa(coa) harus ditambahkan SETELAH row COA ada.
-- ============================================================

-- ============================================================
-- 1. fins_budget.campaign_id → campaigns(id)
-- ============================================================
ALTER TABLE fins_budget
  ADD CONSTRAINT fk_fins_budget_campaign
    FOREIGN KEY (campaign_id)
    REFERENCES campaigns(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_fins_budget_campaign ON fins_budget
  IS 'Anggaran FINS → campaign crowdfunding (SET NULL jika campaign dihapus)';

-- ============================================================
-- 2. fins_trans composite FK → invoices(id, created_at)
--    invoices adalah partitioned table — FK ke parent table,
--    didukung sejak PostgreSQL 14 (Neon menggunakan PG 16+).
-- ============================================================
ALTER TABLE fins_trans
  ADD CONSTRAINT fk_fins_trans_invoice
    FOREIGN KEY (crowdfunding_invoice_id, crowdfunding_invoice_created_at)
    REFERENCES invoices(id, created_at) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_fins_trans_invoice ON fins_trans
  IS 'fins_trans → invoice donasi crowdfunding (composite FK ke partitioned table)';

-- ============================================================
-- 3. invoices.fins_trans_id → fins_trans(id)
-- ============================================================
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_fins_trans
    FOREIGN KEY (fins_trans_id)
    REFERENCES fins_trans(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_invoices_fins_trans ON invoices
  IS 'Invoice crowdfunding → jurnal penerimaan fins_trans';

-- ============================================================
-- 4. payment_methods.fins_coa_debet → fins_coa(coa)
-- ============================================================
ALTER TABLE payment_methods
  ADD CONSTRAINT fk_payment_methods_fins_coa
    FOREIGN KEY (fins_coa_debet)
    REFERENCES fins_coa(coa) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_payment_methods_fins_coa ON payment_methods
  IS 'Payment channel → COA akun bank/digital FINS';

-- ============================================================
-- 5. payment_methods.fins_bank_rek_id → fins_bank_rek(id_rekening)
-- ============================================================
ALTER TABLE payment_methods
  ADD CONSTRAINT fk_payment_methods_fins_bank_rek
    FOREIGN KEY (fins_bank_rek_id)
    REFERENCES fins_bank_rek(id_rekening) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_payment_methods_fins_bank_rek ON payment_methods
  IS 'Payment channel → rekening settlement FINS';

-- ============================================================
-- 6. fins_bank_rek.coa → fins_coa(coa)
--    Ditambah di sini agar seed bank_rek di file 04 tidak
--    memerlukan fins_coa sudah ada terlebih dulu.
-- ============================================================
ALTER TABLE fins_bank_rek
  ADD CONSTRAINT fk_fins_bank_rek_coa
    FOREIGN KEY (coa)
    REFERENCES fins_coa(coa) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT fk_fins_bank_rek_coa ON fins_bank_rek
  IS 'Rekening bank/channel → COA di Chart of Accounts';

-- ============================================================
-- 7. fins_campaign_coa COA columns → fins_coa(coa)
-- ============================================================
ALTER TABLE fins_campaign_coa
  ADD CONSTRAINT fk_campaign_coa_receipt
    FOREIGN KEY (coa_receipt)
    REFERENCES fins_coa(coa) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_campaign_coa_fund
    FOREIGN KEY (coa_fund)
    REFERENCES fins_coa(coa) ON DELETE SET NULL,
  ADD CONSTRAINT fk_campaign_coa_expense
    FOREIGN KEY (coa_expense)
    REFERENCES fins_coa(coa) ON DELETE SET NULL;

-- ============================================================
-- 8. fins_invoice_admin_fee COA columns → fins_coa(coa)
-- ============================================================
ALTER TABLE fins_invoice_admin_fee
  ADD CONSTRAINT fk_inv_fee_coa_receipt
    FOREIGN KEY (coa_receipt)
    REFERENCES fins_coa(coa) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_inv_fee_coa_fee
    FOREIGN KEY (coa_fee)
    REFERENCES fins_coa(coa) ON DELETE SET NULL,
  ADD CONSTRAINT fk_inv_fee_coa_bank
    FOREIGN KEY (coa_bank)
    REFERENCES fins_coa(coa) ON DELETE RESTRICT;

-- ============================================================
-- 9. Partial index untuk jurnal tahun berjalan
--    Menggantikan tabel fins_jurnal_thisyear di MySQL lama.
--    Direcreate setiap 1 Jan oleh Upstash Cron (file 03 triggers).
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fins_jurnal_thisyear
  ON fins_jurnal (tgl_exre DESC, coa, id_kantor)
  WHERE tgl_exre >= '2026-01-01';

COMMENT ON INDEX idx_fins_jurnal_thisyear
  IS 'Partial index jurnal tahun 2026 — pengganti fins_jurnal_thisyear MySQL. Direcreate tiap tahun via Upstash Cron.';

-- ============================================================
-- 10. Verifikasi integritas akhir (DO block)
-- ============================================================
DO $$
DECLARE
  v_bank_count      int;
  v_bank_rek_count  int;
  v_coa_count       int;
  v_trans_count     int;
  v_fee_count       int;
  v_jurnal_count    int;
  v_jurnal_balance  int;
  v_opname_count    int;
  v_opname_daily    int;
  v_opname_monthly  int;
  v_budget_count    int;
  v_summary_count   int;
  v_events_count    int;
  v_linked_invoices int;
  v_linked_pm       int;
  v_campaign_coa    int;
  v_admin_fee_count int;
  v_aset_count      int;
BEGIN
  SELECT COUNT(*) INTO v_bank_count      FROM fins_bank;
  SELECT COUNT(*) INTO v_bank_rek_count  FROM fins_bank_rek;
  SELECT COUNT(*) INTO v_coa_count       FROM fins_coa;
  SELECT COUNT(*) INTO v_trans_count     FROM fins_trans WHERE approve = 'a' AND mutasi != '';
  SELECT COUNT(*) INTO v_fee_count       FROM fins_trans WHERE approve = 'a' AND mutasi = '';
  SELECT COUNT(*) INTO v_jurnal_count    FROM fins_jurnal;
  SELECT COUNT(*) INTO v_opname_count    FROM fins_opname;
  SELECT COUNT(*) INTO v_opname_daily    FROM fins_opname WHERE per = 'd';
  SELECT COUNT(*) INTO v_opname_monthly  FROM fins_opname WHERE per = 'm';
  SELECT COUNT(*) INTO v_budget_count    FROM fins_budget;
  SELECT COUNT(*) INTO v_summary_count   FROM fins_campaign_budget_summary;
  SELECT COUNT(*) INTO v_events_count    FROM fins_upstash_events WHERE status = 'SUCCESS';
  SELECT COUNT(*) INTO v_linked_invoices FROM invoices          WHERE fins_trans_id IS NOT NULL;
  SELECT COUNT(*) INTO v_linked_pm       FROM payment_methods   WHERE fins_coa_debet IS NOT NULL;
  SELECT COUNT(*) INTO v_campaign_coa    FROM fins_campaign_coa;
  SELECT COUNT(*) INTO v_admin_fee_count FROM fins_invoice_admin_fee;
  SELECT COUNT(*) INTO v_aset_count      FROM fins_aset;

  -- Double-entry balance check: debet = kredit per id_trans (excl. fee reklas)
  SELECT COUNT(*) INTO v_jurnal_balance
  FROM (
    SELECT id_trans
    FROM fins_jurnal
    GROUP BY id_trans
    HAVING SUM(debet) != SUM(kredit)
      AND id_trans NOT LIKE '%F'
  ) imbalance;

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════╗';
  RAISE NOTICE '║         FINS Seed Verification Report        ║';
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║ fins_bank                : %s rows', LPAD(v_bank_count::text, 4);
  RAISE NOTICE '║ fins_bank_rek            : %s rows', LPAD(v_bank_rek_count::text, 4);
  RAISE NOTICE '║ fins_coa                 : %s rows', LPAD(v_coa_count::text, 4);
  RAISE NOTICE '║ fins_aset                : %s rows', LPAD(v_aset_count::text, 4);
  RAISE NOTICE '║ fins_budget              : %s rows', LPAD(v_budget_count::text, 4);
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║ fins_trans (penerimaan)  : %s rows', LPAD(v_trans_count::text, 4);
  RAISE NOTICE '║ fins_trans (fee reklas)  : %s rows', LPAD(v_fee_count::text, 4);
  RAISE NOTICE '║ fins_jurnal total        : %s rows', LPAD(v_jurnal_count::text, 4);
  RAISE NOTICE '║ fins_jurnal imbalance    : %s (expect 0)', LPAD(v_jurnal_balance::text, 4);
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║ fins_opname total        : %s rows', LPAD(v_opname_count::text, 4);
  RAISE NOTICE '║  ↳ daily (per=d)         : %s rows', LPAD(v_opname_daily::text, 4);
  RAISE NOTICE '║  ↳ monthly (per=m)       : %s rows', LPAD(v_opname_monthly::text, 4);
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║ fins_campaign_coa        : %s rows', LPAD(v_campaign_coa::text, 4);
  RAISE NOTICE '║ fins_campaign_budget_sum : %s rows', LPAD(v_summary_count::text, 4);
  RAISE NOTICE '║ fins_invoice_admin_fee   : %s rows', LPAD(v_admin_fee_count::text, 4);
  RAISE NOTICE '║ fins_upstash_events OK   : %s rows', LPAD(v_events_count::text, 4);
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║ invoices linked → fins   : %s rows', LPAD(v_linked_invoices::text, 4);
  RAISE NOTICE '║ payment_methods fins_coa : %s rows', LPAD(v_linked_pm::text, 4);
  RAISE NOTICE '╠══════════════════════════════════════════════╣';

  IF v_jurnal_balance = 0 THEN
    RAISE NOTICE '║ Double-entry balance     : ✅ SEIMBANG                ║';
  ELSE
    RAISE WARNING '║ Double-entry balance     : ❌ TIDAK SEIMBANG (% trans)║', v_jurnal_balance;
  END IF;

  IF v_linked_invoices > 0 THEN
    RAISE NOTICE '║ Invoice → fins link      : ✅ OK                      ║';
  ELSE
    RAISE WARNING '║ Invoice → fins link      : ⚠ TIDAK ADA               ║';
  END IF;

  RAISE NOTICE '╚══════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;
