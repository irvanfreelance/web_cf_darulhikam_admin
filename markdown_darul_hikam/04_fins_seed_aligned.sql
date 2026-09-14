-- ============================================================
-- FINS Seed Data — Selaras dengan Crowdfunding Schema
-- Urutan eksekusi dalam file ini HARUS dipertahankan karena
-- setiap section bergantung pada section sebelumnya.
--
-- PRASYARAT (sudah berjalan sebelum file ini):
--   - crowdfunding schema + seed (campaigns, payment_methods,
--     donors, invoices, transactions)
--   - 01_fins_schema_postgres.sql
--   - 02_fins_crowdfunding_integration.sql
--
-- SECTION ORDER:
--   1.  fins_bank
--   2.  fins_bank_rek
--   3.  fins_coa
--   4.  fins_saldo_dana
--   5.  fins_aset
--   6.  fins_report
--   7.  UPDATE payment_methods (fins mapping)
--   8.  fins_campaign_coa
--   9.  fins_budget
--   10. fins_trans (main)
--   11. fins_trans (admin fee reklasifikasi)
--   12. fins_jurnal (double-entry via SELECT)
--   13. fins_invoice_admin_fee
--   14. fins_opname
--   15. fins_campaign_budget_summary
--   16. fins_upstash_events
--   17. UPDATE invoices.fins_trans_id
-- ============================================================

-- ============================================================
-- SECTION 1: fins_bank
-- ============================================================
INSERT INTO fins_bank (id_bank, bank, description_code, dtu) VALUES
('014', 'BANK BCA',                      'BCA|TRANSFER|VA',         NOW()),
('008', 'BANK MANDIRI',                  'MANDIRI|TRANSFER|VA',     NOW()),
('BSI', 'BANK SYARIAH INDONESIA',        'BSI|SYARIAH|VA',          NOW()),
('002', 'BANK BRI',                      'BRI|TRANSFER|VA',         NOW()),
('009', 'BANK BNI',                      'BNI|TRANSFER|VA',         NOW()),
('BJB', 'BANK BJB',                      'BJB|VA',                  NOW()),
('BNC', 'BANK NEO COMMERCE',             'BNC|VA',                  NOW()),
('CIM', 'BANK CIMB NIAGA',               'CIMB|VA',                 NOW()),
('MUA', 'BANK MUAMALAT INDONESIA',       'MUAMALAT|VA',             NOW()),
('PRM', 'BANK PERMATA',                  'PERMATA|VA',              NOW()),
('XND', 'XENDIT PAYMENT GATEWAY',        'XENDIT|VA|QRIS|EWALLET',  NOW()),
('MID', 'MIDTRANS PAYMENT GATEWAY',      'MIDTRANS|GOPAY|VA',       NOW()),
('ALF', 'ALFAMART RETAIL',               'ALFAMART|RETAIL',         NOW()),
('IND', 'INDOMARET RETAIL',              'INDOMARET|RETAIL',        NOW());

-- ============================================================
-- SECTION 2: fins_bank_rek
-- Rekening & settlement channel yang dimiliki/dipakai organisasi
-- ============================================================
INSERT INTO fins_bank_rek (id_rekening, id_bank, keterangan, coa, active, scrap, note, dtu) VALUES
-- Rekening nyata milik yayasan (untuk transfer manual)
('0987654321',        '014', 'BCA Transfer Manual — Yayasan Peduli Sesama',              '101.02.001.000', 'y', 'n', 'a.n. Yayasan Peduli Sesama; konfirmasi manual + bukti TF', NOW()),
('1234567890',        '008', 'Mandiri Transfer Manual — Yayasan Peduli Sesama',           '101.02.002.000', 'y', 'n', 'a.n. Yayasan Peduli Sesama; konfirmasi manual + bukti TF', NOW()),
-- Settlement channel Xendit
('XENDIT-EWALLET',    'XND', 'Xendit E-Wallet Settlement (ShopeePay / DANA / LinkAja)',  '101.02.004.000', 'y', 'n', 'Consolidated Xendit e-wallet settlement D+1',             NOW()),
('XENDIT-QRIS',       'XND', 'Xendit QRIS Dynamic Settlement',                           '101.02.006.000', 'y', 'n', 'Settlement QRIS Xendit D+1',                              NOW()),
('XENDIT-VA-BCA',     '014', 'Xendit Virtual Account BCA',                               '101.02.007.000', 'y', 'n', 'Settlement VA BCA Xendit D+2',                            NOW()),
('XENDIT-VA-MANDIRI', '008', 'Xendit Virtual Account Mandiri',                           '101.02.008.000', 'y', 'n', 'Settlement VA Mandiri Xendit D+2',                        NOW()),
('XENDIT-VA-BSI',     'BSI', 'Xendit Virtual Account BSI',                               '101.02.009.000', 'y', 'n', 'Settlement VA BSI Xendit D+2',                            NOW()),
('XENDIT-VA-BRI',     '002', 'Xendit Virtual Account BRI',                               '101.02.010.000', 'y', 'n', 'Settlement VA BRI Xendit D+2',                            NOW()),
('XENDIT-VA-BNI',     '009', 'Xendit Virtual Account BNI',                               '101.02.011.000', 'y', 'n', 'Settlement VA BNI Xendit D+2',                            NOW()),
('XENDIT-VA-LAIN',    'XND', 'Xendit VA Lainnya (BJB / BNC / CIMB / Muamalat / Permata)','101.02.012.000','y', 'n', '',                                                        NOW()),
('XENDIT-RETAIL',     'XND', 'Xendit Retail Outlet (Alfamart / Indomaret)',               '101.02.013.000', 'y', 'n', 'Settlement retail D+2',                                  NOW()),
-- Settlement channel Midtrans
('MIDTRANS-GOPAY',    'MID', 'Midtrans GoPay Settlement',                                '101.02.005.000', 'y', 'n', 'Settlement GoPay Midtrans D+1',                           NOW());

-- ============================================================
-- SECTION 3: fins_coa — Chart of Accounts
-- Hierarki: AKTIVA (100) | KEWAJIBAN (200) | DANA/EKUITAS (300)
--           | PENERIMAAN (400) | PENGELUARAN (500)
-- Format coa: xxx.xx.xxx.xxx
-- saldo: d=Debet normal, k=Kredit normal
-- parent: y=akun induk (tidak dipakai di jurnal), n=leaf/detail
-- ============================================================

-- ── L1: Kelompok Besar ────────────────────────────────────────
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('100.00.000.000','<b>AKTIVA</b>',            '0',1,'1,9','y','y','y','d','Seluruh aset/harta organisasi',NOW()),
('200.00.000.000','<b>KEWAJIBAN</b>',         '0',1,'2',  'y','y','y','k','Seluruh kewajiban/liabilitas',  NOW()),
('300.00.000.000','<b>DANA / EKUITAS</b>',    '0',1,'3',  'y','y','y','k','Saldo dana program organisasi', NOW()),
('400.00.000.000','<b>PENERIMAAN</b>',        '0',1,'4',  'y','y','y','k','Seluruh penerimaan/pendapatan', NOW()),
('500.00.000.000','<b>PENGELUARAN</b>',       '0',1,'5',  'y','y','y','d','Seluruh pengeluaran/biaya',     NOW());

-- ── L2: Sub-Kelompok ─────────────────────────────────────────
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('101.00.000.000','Aktiva Lancar',             '100.00.000.000',2,'1,9','y','y','y','d','Kas, bank, piutang',NOW()),
('102.00.000.000','Aktiva Tetap',              '100.00.000.000',2,'1,9','y','y','y','d','Peralatan, inventaris kantor',NOW()),
('201.00.000.000','Kewajiban Jangka Pendek',   '200.00.000.000',2,'2',  'y','y','y','k','Titipan dana belum disalurkan',NOW()),
('300.01.000.000','Dana Sosial & Kemanusiaan', '300.00.000.000',2,'3',  'y','y','y','k','Dana program sosial, kesehatan, bencana',NOW()),
('300.02.000.000','Dana Zakat',                '300.00.000.000',2,'3',  'y','y','y','k','Dana zakat maal & profesi',NOW()),
('300.03.000.000','Dana Qurban',               '300.00.000.000',2,'3',  'y','y','y','k','Dana ibadah qurban tahunan',NOW()),
('300.04.000.000','Dana Infaq & Shadaqah',     '300.00.000.000',2,'3',  'y','y','y','k','Dana infaq & shadaqah umum',NOW()),
('300.05.000.000','Dana Operasional Platform', '300.00.000.000',2,'3',  'y','y','y','k','Saldo operasional yayasan',NOW()),
('401.00.000.000','Penerimaan Donasi',         '400.00.000.000',2,'4',  'y','y','y','k','Semua donasi masuk via crowdfunding',NOW()),
('402.00.000.000','Pendapatan Platform',       '400.00.000.000',2,'4',  'y','y','y','k','Fee admin & komisi afiliasi',NOW()),
('501.00.000.000','Penyaluran Dana Program',   '500.00.000.000',2,'5',  'y','y','y','d','Pengeluaran realisasi program',NOW()),
('502.00.000.000','Biaya Operasional Platform','500.00.000.000',2,'5',  'y','y','y','d','Biaya payment gateway, pemasaran, dll',NOW());

-- ── L3: Kas, Bank, Kewajiban, Dana, Penerimaan, Pengeluaran ──
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('101.01.000.000','Kas',                              '101.00.000.000',3,'3','y','y','y','d','Uang tunai di kantor',NOW()),
('101.02.000.000','Bank & Rekening Digital',          '101.00.000.000',3,'3','y','y','y','d','Rekening bank + settlement channel',NOW()),
('101.03.000.000','Piutang & Tagihan Pending',        '101.00.000.000',3,'3','y','y','y','d','Invoice PENDING belum dibayar donatur',NOW()),
('102.01.000.000','Peralatan & Inventaris Kantor',    '102.00.000.000',3,'1','y','y','y','d','Laptop, server, furniture',NOW()),
('201.01.000.000','Titipan Dana Zakat',               '201.00.000.000',3,'2','y','y','y','k','Zakat diterima, belum disalurkan',NOW()),
('201.02.000.000','Titipan Dana Qurban',              '201.00.000.000',3,'2','y','y','y','k','Qurban diterima, belum disalurkan',NOW()),
-- Dana per program (leaf)
('300.01.001.000','Dana Kesehatan',                   '300.01.000.000',3,'3','n','y','y','k','Campaign individu sakit, operasi, dll',NOW()),
('300.01.002.000','Dana Kemanusiaan & Bencana',       '300.01.000.000',3,'3','n','y','y','k','Campaign bencana & kemanusiaan',NOW()),
('300.01.003.000','Dana Pangan',                      '300.01.000.000',3,'3','n','y','y','k','Campaign bantuan pangan',NOW()),
('300.01.004.000','Dana Sosial & Yatim',              '300.01.000.000',3,'3','n','y','y','k','Campaign sosial, yatim, berbuka',NOW()),
('300.01.005.000','Dana Masjid & Wakaf',              '300.01.000.000',3,'3','n','y','y','k','Campaign masjid & wakaf',NOW()),
('300.02.001.000','Zakat Profesi & Maal',             '300.02.000.000',3,'3','n','y','y','k','Penerimaan zakat maal dan profesi',NOW()),
('300.03.001.000','Qurban Kambing',                   '300.03.000.000',3,'3','n','y','y','k','Dana qurban kambing pedalaman',NOW()),
('300.03.002.000','Qurban Sapi Patungan 1/7',         '300.03.000.000',3,'3','n','y','y','k','Dana qurban sapi 1/7 bagian',NOW()),
('300.03.003.000','Qurban Sapi Utuh',                 '300.03.000.000',3,'3','n','y','y','k','Dana qurban 1 ekor sapi utuh',NOW()),
('300.04.001.000','Infaq Operasional Dakwah',         '300.04.000.000',3,'3','n','y','y','k','Campaign infaq operasional yayasan',NOW()),
-- Penerimaan per jenis (parent L3)
('401.01.000.000','Donasi Kesehatan',                 '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.02.000.000','Donasi Kemanusiaan',               '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.03.000.000','Donasi Pangan',                    '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.04.000.000','Donasi Sosial',                    '401.00.000.000',3,'4','y','y','y','k','Berbuka, yatim, bundle',NOW()),
('401.05.000.000','Penerimaan Zakat',                 '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.06.000.000','Penerimaan Qurban',                '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.07.000.000','Penerimaan Infaq',                 '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('401.08.000.000','Donasi Masjid & Wakaf',            '401.00.000.000',3,'4','y','y','y','k','',NOW()),
('402.01.000.000','Biaya Admin Payment Gateway',      '402.00.000.000',3,'4','n','y','y','k','Admin fee dibebankan ke donatur',NOW()),
('402.02.000.000','Platform Fee & Komisi Afiliasi',   '402.00.000.000',3,'4','n','y','y','k','Komisi afiliator & fee platform',NOW()),
-- Penyaluran per program (leaf)
('501.01.000.000','Penyaluran Kesehatan',             '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.02.000.000','Penyaluran Kemanusiaan',           '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.03.000.000','Penyaluran Pangan',                '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.04.000.000','Penyaluran Sosial & Yatim',        '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.05.000.000','Penyaluran Zakat',                 '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.06.000.000','Penyaluran Qurban',                '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.07.000.000','Penyaluran Infaq',                 '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('501.08.000.000','Penyaluran Masjid & Wakaf',        '501.00.000.000',3,'5','n','y','y','d','',NOW()),
('502.01.000.000','Biaya Payment Gateway (Platform)', '502.00.000.000',3,'5','n','y','y','d','Fee Xendit/Midtrans ditanggung platform',NOW()),
('502.02.000.000','Biaya Pemasaran & Promosi',        '502.00.000.000',3,'5','n','y','y','d','Iklan, boosting, afiliasi',NOW()),
('502.03.000.000','Biaya Operasional Kantor',         '502.00.000.000',3,'5','n','y','y','d','Gaji, sewa, utilitas',NOW());

-- ── L4: Kas & Bank Detail (leaf) ─────────────────────────────
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('101.01.001.000','Kas Pusat',                             '101.01.000.000',4,'3','n','y','y','d','Kas fisik kantor pusat',NOW()),
('101.02.001.000','BCA — Transfer Manual',                 '101.02.000.000',4,'3','n','y','y','d','Rek. 0987654321 a.n Yayasan Peduli Sesama',NOW()),
('101.02.002.000','Mandiri — Transfer Manual',             '101.02.000.000',4,'3','n','y','y','d','Rek. 1234567890 a.n Yayasan Peduli Sesama',NOW()),
('101.02.004.000','E-Wallet Xendit (ShopeePay/DANA/LinkAja)','101.02.000.000',4,'3','n','y','y','d','Settlement e-wallet Xendit D+1',NOW()),
('101.02.005.000','GoPay — Midtrans Settlement',           '101.02.000.000',4,'3','n','y','y','d','Settlement GoPay via Midtrans D+1',NOW()),
('101.02.006.000','QRIS Xendit Settlement',                '101.02.000.000',4,'3','n','y','y','d','Settlement QRIS Dynamic Xendit D+1',NOW()),
('101.02.007.000','BCA Virtual Account — Xendit',          '101.02.000.000',4,'3','n','y','y','d','Settlement VA BCA Xendit D+2',NOW()),
('101.02.008.000','Mandiri Virtual Account — Xendit',      '101.02.000.000',4,'3','n','y','y','d','Settlement VA Mandiri Xendit D+2',NOW()),
('101.02.009.000','BSI Virtual Account — Xendit',          '101.02.000.000',4,'3','n','y','y','d','Settlement VA BSI Xendit D+2',NOW()),
('101.02.010.000','BRI Virtual Account — Xendit',          '101.02.000.000',4,'3','n','y','y','d','Settlement VA BRI Xendit D+2',NOW()),
('101.02.011.000','BNI Virtual Account — Xendit',          '101.02.000.000',4,'3','n','y','y','d','Settlement VA BNI Xendit D+2',NOW()),
('101.02.012.000','VA Lainnya — Xendit (BJB/BNC/CIMB/Muamalat/Permata)','101.02.000.000',4,'3','n','y','y','d','',NOW()),
('101.02.013.000','Retail Outlet — Xendit (Alfamart/Indomaret)','101.02.000.000',4,'3','n','y','y','d','Settlement retail D+2',NOW()),
('101.03.001.000','Piutang Donatur — Invoice PENDING',     '101.03.000.000',4,'3','n','y','y','d','Invoice belum dikonfirmasi bayar',NOW()),
-- Penerimaan per campaign (leaf L4)
('401.01.001.000','Donasi Kesehatan Individu',             '401.01.000.000',4,'4','n','y','y','k','Campaign Bu Dede Patah Tulang & individu lain',NOW()),
('401.02.001.000','Donasi Bencana Alam',                   '401.02.000.000',4,'4','n','y','y','k','Banjir, gempa, angin, dll',NOW()),
('401.02.002.000','Donasi Panti & Yatim — Bencana',        '401.02.000.000',4,'4','n','y','y','k','Panti asuhan terdampak bencana',NOW()),
('401.03.001.000','Bantuan Pangan Korban Bencana',         '401.03.000.000',4,'4','n','y','y','k','Distribusi sembako korban banjir/bencana',NOW()),
('401.04.001.000','Sedekah Berbuka Puasa',                 '401.04.000.000',4,'4','n','y','y','k','Paket berbuka untuk kaum dhuafa jalanan',NOW()),
('401.04.002.000','Paket Bundle Basmalah',                 '401.04.000.000',4,'4','n','y','y','k','Bundle 5 berbuka + 8 kado yatim lebaran',NOW()),
('401.04.003.000','Kado Yatim Lebaran',                    '401.04.000.000',4,'4','n','y','y','k','Item kado yatim (hidden campaign bundle)',NOW()),
('401.05.001.000','Zakat Profesi & Maal',                  '401.05.000.000',4,'4','n','y','y','k','Penerimaan zakat dari muzakki',NOW()),
('401.06.001.000','Qurban Kambing Pedalaman',              '401.06.000.000',4,'4','n','y','y','k','1 ekor kambing per paket qurban',NOW()),
('401.06.002.000','Qurban Sapi Patungan 1/7',              '401.06.000.000',4,'4','n','y','y','k','1/7 bagian sapi per peserta patungan',NOW()),
('401.06.003.000','Qurban Sapi 1 Ekor Utuh',               '401.06.000.000',4,'4','n','y','y','k','1 ekor sapi qurban utuh',NOW()),
('401.07.001.000','Infaq Operasional & Dakwah',            '401.07.000.000',4,'4','n','y','y','k','Infaq bebas untuk operasional yayasan',NOW()),
('401.08.001.000','Donasi Pembangunan Masjid',             '401.08.000.000',4,'4','n','y','y','k','Masjid Al-Ikhlas & program masjid lain',NOW());

-- ============================================================
-- SECTION 4: fins_saldo_dana — Mapping dana ke COA penerimaan/pengeluaran
-- ============================================================
INSERT INTO fins_saldo_dana (coa_dana, coa_expend, coa_receipt, ops, dtu) VALUES
('300.01.000.000',
  '501.01.000.000,501.02.000.000,501.03.000.000,501.04.000.000,501.08.000.000',
  '401.01.000.000,401.02.000.000,401.03.000.000,401.04.000.000,401.08.000.000',
  'n', NOW()),
('300.02.000.000',
  '501.05.000.000',
  '401.05.000.000',
  'n', NOW()),
('300.03.000.000',
  '501.06.000.000',
  '401.06.000.000',
  'n', NOW()),
('300.04.000.000',
  '501.07.000.000',
  '401.07.000.000',
  'n', NOW()),
('300.05.000.000',
  '502.00.000.000',
  '402.01.000.000,402.02.000.000',
  'y', NOW());

-- ============================================================
-- SECTION 5: fins_aset — Aset tetap organisasi (sample)
-- ============================================================
INSERT INTO fins_aset (
  kode_aset, aset, coa, deskripsi,
  tgl_akuisisi, biaya_akuisisi,
  id_kantor, metode, masa_manfaat, tgl_akhir_manfaat,
  persentase_susut, coa_debit, coa_kredit,
  deleted, user_update, note, dtu
) VALUES
('AST-2024-001', 'Laptop Dell Latitude 5540 — Admin Keuangan',  '102.01.000.000',
  'Laptop Intel i5 Gen 13, 16GB RAM, 512GB SSD',
  '2024-01-15', 12000000, 1, 'Garis Lurus', 48, '2028-01-15',
  25.00, '502.01.000.000', '102.01.000.000',
  'n', 'ADMIN001', 'Dipakai tim keuangan untuk input jurnal', NOW()),

('AST-2024-002', 'Laptop ASUS Vivobook 16 — Tim IT',           '102.01.000.000',
  'Laptop AMD Ryzen 5, 8GB RAM, 512GB SSD',
  '2024-03-01', 8500000, 1, 'Garis Lurus', 48, '2028-03-01',
  25.00, '502.01.000.000', '102.01.000.000',
  'n', 'ADMIN001', 'Dipakai pengembang platform crowdfunding', NOW()),

('AST-2024-003', 'Server NAS Synology DS923+',                  '102.01.000.000',
  '4-bay NAS untuk backup data donasi & laporan keuangan',
  '2024-06-01', 18000000, 1, 'Garis Lurus', 60, '2029-06-01',
  20.00, '502.01.000.000', '102.01.000.000',
  'n', 'ADMIN001', 'Backup harian database Neon PG & laporan PDF', NOW()),

('AST-2025-001', 'Meja Kerja Set (5 Unit) — Kantor Pusat',     '102.01.000.000',
  'Meja L-Shape + kursi ergonomis, 5 set',
  '2025-01-10', 15000000, 1, 'Garis Lurus', 60, '2030-01-10',
  20.00, '502.01.000.000', '102.01.000.000',
  'n', 'ADMIN001', 'Inventaris kantor pusat yayasan', NOW()),

('AST-2025-002', 'Printer Epson L6570 — Kantor Pusat',         '102.01.000.000',
  'Printer multifungsi A4 ink-tank',
  '2025-02-15', 5000000, 1, 'Garis Lurus', 48, '2029-02-15',
  25.00, '502.01.000.000', '102.01.000.000',
  'n', 'ADMIN001', 'Cetak laporan keuangan & sertifikat donasi', NOW());

-- ============================================================
-- SECTION 6: fins_report — Struktur baris laporan keuangan
-- report codes: LPK=Posisi Keuangan, LPO=Penerimaan/Pengeluaran,
--               LAK=Arus Kas, LPD=Penerimaan Donasi
-- ============================================================

-- Laporan Posisi Keuangan (LPK / Balance Sheet)
INSERT INTO fins_report (nama_coa,level,coa,report,active,sort,keterangan,kode,dtu) VALUES
('<b>ASET</b>',                                1,'',                'LPK','y', 1, '','',NOW()),
('<b>Aset Lancar</b>',                         1,'',                'LPK','y', 2, '','',NOW()),
('Kas Pusat',                                  2,'101.01.001.000',  'LPK','y', 3, '','',NOW()),
('BCA Manual',                                 2,'101.02.001.000',  'LPK','y', 4, '','',NOW()),
('Mandiri Manual',                             2,'101.02.002.000',  'LPK','y', 5, '','',NOW()),
('E-Wallet Xendit Settlement',                 2,'101.02.004.000',  'LPK','y', 6, '','',NOW()),
('GoPay Midtrans Settlement',                  2,'101.02.005.000',  'LPK','y', 7, '','',NOW()),
('QRIS Xendit Settlement',                     2,'101.02.006.000',  'LPK','y', 8, '','',NOW()),
('BCA VA Xendit',                              2,'101.02.007.000',  'LPK','y', 9, '','',NOW()),
('Mandiri VA Xendit',                          2,'101.02.008.000',  'LPK','y',10, '','',NOW()),
('BSI VA Xendit',                              2,'101.02.009.000',  'LPK','y',11, '','',NOW()),
('BRI VA Xendit',                              2,'101.02.010.000',  'LPK','y',12, '','',NOW()),
('BNI VA Xendit',                              2,'101.02.011.000',  'LPK','y',13, '','',NOW()),
('VA Lainnya Xendit',                          2,'101.02.012.000',  'LPK','y',14, '','',NOW()),
('Retail Outlet Xendit',                       2,'101.02.013.000',  'LPK','y',15, '','',NOW()),
('Piutang Donatur (Invoice Pending)',           2,'101.03.001.000',  'LPK','y',16, '','',NOW()),
('<b>Total Aset Lancar</b>',                   3,'101.00.000.000',  'LPK','y',17, 'Σ','T1',NOW()),
('<b>Aset Tetap</b>',                          1,'',                'LPK','y',18, '','',NOW()),
('Peralatan & Inventaris',                     2,'102.01.000.000',  'LPK','y',19, '','',NOW()),
('<b>Total Aset Tetap</b>',                    3,'102.00.000.000',  'LPK','y',20, 'Σ','T2',NOW()),
('<b>TOTAL ASET</b>',                          4,'100.00.000.000',  'LPK','y',21, 'T1+T2','TA',NOW()),
('<b>KEWAJIBAN</b>',                           1,'',                'LPK','y',22, '','',NOW()),
('Titipan Dana Zakat',                         2,'201.01.000.000',  'LPK','y',23, '','',NOW()),
('Titipan Dana Qurban',                        2,'201.02.000.000',  'LPK','y',24, '','',NOW()),
('<b>Total Kewajiban</b>',                     3,'201.00.000.000',  'LPK','y',25, 'Σ','TK',NOW()),
('<b>DANA / EKUITAS</b>',                      1,'',                'LPK','y',26, '','',NOW()),
('Dana Sosial & Kemanusiaan',                  2,'300.01.000.000',  'LPK','y',27, '','',NOW()),
('Dana Zakat',                                 2,'300.02.000.000',  'LPK','y',28, '','',NOW()),
('Dana Qurban',                                2,'300.03.000.000',  'LPK','y',29, '','',NOW()),
('Dana Infaq & Shadaqah',                      2,'300.04.000.000',  'LPK','y',30, '','',NOW()),
('Dana Operasional Platform',                  2,'300.05.000.000',  'LPK','y',31, '','',NOW()),
('<b>Total Dana</b>',                          3,'300.00.000.000',  'LPK','y',32, 'Σ','TD',NOW()),
('<b>TOTAL KEWAJIBAN + DANA</b>',              4,'200.00.000.000,300.00.000.000','LPK','y',33,'TK+TD','TKD',NOW());

-- Laporan Penerimaan & Pengeluaran (LPO / Income Statement NPO)
INSERT INTO fins_report (nama_coa,level,coa,report,active,sort,keterangan,kode,dtu) VALUES
('<b>PENERIMAAN</b>',                          1,'',                'LPO','y', 1, '','',NOW()),
('Donasi Kesehatan',                           2,'401.01.000.000',  'LPO','y', 2, '','P01',NOW()),
('Donasi Kemanusiaan',                         2,'401.02.000.000',  'LPO','y', 3, '','P02',NOW()),
('Donasi Pangan',                              2,'401.03.000.000',  'LPO','y', 4, '','P03',NOW()),
('Donasi Sosial (Berbuka, Yatim, Bundle)',      2,'401.04.000.000',  'LPO','y', 5, '','P04',NOW()),
('Penerimaan Zakat',                           2,'401.05.000.000',  'LPO','y', 6, '','P05',NOW()),
('Penerimaan Qurban',                          2,'401.06.000.000',  'LPO','y', 7, '','P06',NOW()),
('Penerimaan Infaq',                           2,'401.07.000.000',  'LPO','y', 8, '','P07',NOW()),
('Donasi Masjid & Wakaf',                      2,'401.08.000.000',  'LPO','y', 9, '','P08',NOW()),
('Biaya Admin (Pendapatan Platform)',           2,'402.01.000.000',  'LPO','y',10, '','P09',NOW()),
('Platform Fee & Komisi',                      2,'402.02.000.000',  'LPO','y',11, '','P10',NOW()),
('<b>Total Penerimaan</b>',                    3,'400.00.000.000',  'LPO','y',12, 'Σ','TP',NOW()),
('<b>PENGELUARAN / PENYALURAN</b>',            1,'',                'LPO','y',20, '','',NOW()),
('Penyaluran Kesehatan',                       2,'501.01.000.000',  'LPO','y',21, '','E01',NOW()),
('Penyaluran Kemanusiaan',                     2,'501.02.000.000',  'LPO','y',22, '','E02',NOW()),
('Penyaluran Pangan',                          2,'501.03.000.000',  'LPO','y',23, '','E03',NOW()),
('Penyaluran Sosial & Yatim',                  2,'501.04.000.000',  'LPO','y',24, '','E04',NOW()),
('Penyaluran Zakat',                           2,'501.05.000.000',  'LPO','y',25, '','E05',NOW()),
('Penyaluran Qurban',                          2,'501.06.000.000',  'LPO','y',26, '','E06',NOW()),
('Penyaluran Infaq',                           2,'501.07.000.000',  'LPO','y',27, '','E07',NOW()),
('Penyaluran Masjid & Wakaf',                  2,'501.08.000.000',  'LPO','y',28, '','E08',NOW()),
('Biaya Gateway (Platform)',                   2,'502.01.000.000',  'LPO','y',29, '','E09',NOW()),
('Biaya Pemasaran',                            2,'502.02.000.000',  'LPO','y',30, '','E10',NOW()),
('Biaya Operasional Kantor',                   2,'502.03.000.000',  'LPO','y',31, '','E11',NOW()),
('<b>Total Pengeluaran</b>',                   3,'500.00.000.000',  'LPO','y',32, 'Σ','TE',NOW()),
('<b>SURPLUS / (DEFISIT)</b>',                 4,'400.00.000.000,500.00.000.000','LPO','y',33,'TP-TE','SD',NOW());

-- Laporan Penerimaan Donasi per Campaign (LPD)
INSERT INTO fins_report (nama_coa,level,coa,report,active,sort,keterangan,kode,dtu) VALUES
('<b>LAPORAN PENERIMAAN DONASI</b>',           1,'',                'LPD','y', 1, '','',NOW()),
('Kesehatan — Bu Dede Patah Tulang',           2,'401.01.001.000',  'LPD','y', 2, 'Campaign #1','C01',NOW()),
('Kemanusiaan — Panti Yatim Aceh',             2,'401.02.002.000',  'LPD','y', 3, 'Campaign #2','C02',NOW()),
('Pangan — Banjir Bandang',                    2,'401.03.001.000',  'LPD','y', 4, 'Campaign #3','C03',NOW()),
('Sosial — Sedekah Berbuka',                   2,'401.04.001.000',  'LPD','y', 5, 'Campaign #4','C04',NOW()),
('Zakat Profesi & Maal',                       2,'401.05.001.000',  'LPD','y', 6, 'Campaign #5','C05',NOW()),
('Qurban Kambing Pedalaman',                   2,'401.06.001.000',  'LPD','y', 7, 'Campaign #6','C06',NOW()),
('Qurban Sapi Patungan 1/7',                   2,'401.06.002.000',  'LPD','y', 8, 'Campaign #7','C07',NOW()),
('Qurban Sapi 1 Ekor Utuh',                    2,'401.06.003.000',  'LPD','y', 9, 'Campaign #8','C08',NOW()),
('Infaq Operasional Dakwah',                   2,'401.07.001.000',  'LPD','y',10, 'Campaign #9','C09',NOW()),
('Paket Bundle Basmalah',                      2,'401.04.002.000',  'LPD','y',11, 'Campaign #10','C10',NOW()),
('Masjid Al-Ikhlas',                           2,'401.08.001.000',  'LPD','y',12, 'Campaign #11','C11',NOW()),
('<b>Total Penerimaan Donasi</b>',             3,'401.00.000.000',  'LPD','y',20, 'Σ seluruh','TPD',NOW());

-- Laporan Arus Kas (LAK / Cash Flow)
INSERT INTO fins_report (nama_coa,level,coa,report,active,sort,keterangan,kode,dtu) VALUES
('<b>ARUS KAS — AKTIVITAS OPERASI</b>',        1,'',                'LAK','y', 1, '','',NOW()),
('Penerimaan Donasi (Kas Masuk)',               2,'401.00.000.000',  'LAK','y', 2, '+','AO1',NOW()),
('Penyaluran Program (Kas Keluar)',             2,'501.00.000.000',  'LAK','y', 3, '-','AO2',NOW()),
('Biaya Operasional (Kas Keluar)',              2,'502.00.000.000',  'LAK','y', 4, '-','AO3',NOW()),
('<b>Arus Kas Bersih — Operasi</b>',            3,'',                'LAK','y', 5, 'AO1-AO2-AO3','AOT',NOW()),
('<b>ARUS KAS — AKTIVITAS INVESTASI</b>',       1,'',                'LAK','y',10, '','',NOW()),
('Pembelian Aset Tetap',                        2,'102.00.000.000',  'LAK','y',11, '-','AI1',NOW()),
('<b>Arus Kas Bersih — Investasi</b>',          3,'',                'LAK','y',12, '-AI1','AIT',NOW()),
('<b>KENAIKAN / (PENURUNAN) KAS BERSIH</b>',   4,'',                'LAK','y',20, 'AOT+AIT','AKB',NOW()),
('Saldo Kas & Bank Awal Periode',               2,'101.00.000.000',  'LAK','y',21, 'Saldo awal','SA',NOW()),
('<b>Saldo Kas & Bank Akhir Periode</b>',       4,'101.00.000.000',  'LAK','y',22, 'SA+AKB','SAK',NOW());

-- ============================================================
-- SECTION 7: UPDATE payment_methods — Pasang fins mapping
--    AMAN dijalankan karena fins_coa & fins_bank_rek sudah ada
-- ============================================================
UPDATE payment_methods SET fins_coa_debet = '101.02.005.000', fins_mutasi = 'e',  fins_bank_rek_id = 'MIDTRANS-GOPAY'    WHERE code = 'GOPAY';
UPDATE payment_methods SET fins_coa_debet = '101.02.007.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-BCA'     WHERE code = 'BCA';
UPDATE payment_methods SET fins_coa_debet = '101.02.008.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-MANDIRI' WHERE code = 'MANDIRI';
UPDATE payment_methods SET fins_coa_debet = '101.02.009.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-BSI'     WHERE code = 'BSI';
UPDATE payment_methods SET fins_coa_debet = '101.02.006.000', fins_mutasi = '4',  fins_bank_rek_id = 'XENDIT-QRIS'       WHERE code = 'QR_CODE';
UPDATE payment_methods SET fins_coa_debet = '101.02.004.000', fins_mutasi = 'e',  fins_bank_rek_id = 'XENDIT-EWALLET'    WHERE code = 'SHOPEEPAY';
UPDATE payment_methods SET fins_coa_debet = '101.02.004.000', fins_mutasi = 'e',  fins_bank_rek_id = 'XENDIT-EWALLET'    WHERE code = 'DANA';
UPDATE payment_methods SET fins_coa_debet = '101.02.004.000', fins_mutasi = 'e',  fins_bank_rek_id = 'XENDIT-EWALLET'    WHERE code = 'LINKAJA';
UPDATE payment_methods SET fins_coa_debet = '101.02.010.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-BRI'     WHERE code = 'BRI';
UPDATE payment_methods SET fins_coa_debet = '101.02.011.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-BNI'     WHERE code = 'BNI';
UPDATE payment_methods SET fins_coa_debet = '101.02.012.000', fins_mutasi = '2',  fins_bank_rek_id = 'XENDIT-VA-LAIN'    WHERE code IN ('BJB','BNC','CIMB','MUAMALAT','PERMATA');
UPDATE payment_methods SET fins_coa_debet = '101.02.013.000', fins_mutasi = '6',  fins_bank_rek_id = 'XENDIT-RETAIL'     WHERE code IN ('ALFAMART','INDOMARET');
UPDATE payment_methods SET fins_coa_debet = '101.02.001.000', fins_mutasi = '3',  fins_bank_rek_id = '0987654321'        WHERE id = 18;  -- Manual BCA
UPDATE payment_methods SET fins_coa_debet = '101.02.002.000', fins_mutasi = '3',  fins_bank_rek_id = '1234567890'        WHERE id = 19;  -- Manual Mandiri

-- ============================================================
-- SECTION 8: fins_campaign_coa — Mapping campaign ke COA
-- ============================================================
INSERT INTO fins_campaign_coa (campaign_id, coa_receipt, coa_fund, coa_expense, is_primary, note) VALUES
(1,  '401.01.001.000', '300.01.001.000', '501.01.000.000', true, 'Donasi Kesehatan — Bu Dede Patah Tulang'),
(2,  '401.02.002.000', '300.01.002.000', '501.02.000.000', true, 'Donasi Panti Yatim Terdampak Bencana Aceh'),
(3,  '401.03.001.000', '300.01.003.000', '501.03.000.000', true, 'Bantuan Pangan Korban Banjir Bandang'),
(4,  '401.04.001.000', '300.01.004.000', '501.04.000.000', true, 'Sedekah Paket Berbuka Puasa Pejuang Jalanan'),
(5,  '401.05.001.000', '300.02.001.000', '501.05.000.000', true, 'Penerimaan Zakat Profesi & Maal'),
(6,  '401.06.001.000', '300.03.001.000', '501.06.000.000', true, 'Qurban Kambing Pedalaman'),
(7,  '401.06.002.000', '300.03.002.000', '501.06.000.000', true, 'Qurban Sapi Patungan 1/7'),
(8,  '401.06.003.000', '300.03.003.000', '501.06.000.000', true, 'Qurban Sapi 1 Ekor Utuh Pedalaman'),
(9,  '401.07.001.000', '300.04.001.000', '501.07.000.000', true, 'Infaq Operasional & Pengembangan Dakwah'),
(10, '401.04.002.000', '300.01.004.000', '501.04.000.000', true, 'Paket Basmalah Bundle (Berbuka + Kado Yatim)'),
(11, '401.08.001.000', '300.01.005.000', '501.08.000.000', true, 'Pembangunan Masjid Al-Ikhlas'),
(12, '401.04.003.000', '300.01.004.000', '501.04.000.000', true, 'Kado Yatim Lebaran — hidden campaign bundle');

-- ============================================================
-- SECTION 9: fins_budget — Anggaran per campaign (target)
-- ============================================================
INSERT INTO fins_budget (tanggal,coa,budget,saldo_akhir,nik_input,nik_approve,id_kantor,id_program,approve,keterangan,campaign_id,dtu) VALUES
('2026-05-01','401.01.001.000', 150000000, 150000000,'SYSTEM_API','ADMIN001',1,1,'a','Target donasi: Suami Telah Tiada — Bu Dede Berjuang Sembuh',  1, NOW()),
('2026-05-01','401.02.002.000', 300000000, 300000000,'SYSTEM_API','ADMIN001',1,2,'a','Target donasi: Bantu Panti Yatim Terdampak Bencana Aceh',     2, NOW()),
('2026-05-01','401.03.001.000',  50000000,  50000000,'SYSTEM_API','ADMIN001',1,3,'a','Target donasi: Bantuan Pangan Korban Banjir Bandang',          3, NOW()),
('2026-05-01','401.04.001.000',  70000000,  70000000,'SYSTEM_API','ADMIN001',1,4,'a','Target donasi: Sedekah Berbuka Puasa Pejuang Jalanan',         4, NOW()),
('2026-05-01','401.05.001.000', 500000000, 500000000,'SYSTEM_API','ADMIN001',1,5,'a','Target donasi: Tunaikan Zakat Profesi & Maal',                 5, NOW()),
('2026-05-01','401.06.001.000', 200000000, 200000000,'SYSTEM_API','ADMIN001',1,6,'a','Target donasi: Qurban Pedalaman Kambing',                      6, NOW()),
('2026-05-01','401.06.002.000', 315000000, 315000000,'SYSTEM_API','ADMIN001',1,7,'a','Target donasi: Patungan 1/7 Sapi Pedalaman',                   7, NOW()),
('2026-05-01','401.06.003.000', 420000000, 420000000,'SYSTEM_API','ADMIN001',1,8,'a','Target donasi: Qurban 1 Ekor Sapi Utuh Pedalaman',             8, NOW()),
('2026-05-01','401.07.001.000',          0,         0,'SYSTEM_API','ADMIN001',1,9,'a','Target terbuka: Infaq Operasional & Dakwah',                   9, NOW()),
('2026-05-01','401.04.002.000', 500000000, 500000000,'SYSTEM_API','ADMIN001',1,10,'a','Target donasi: Paket Basmalah Bundle',                        10, NOW()),
('2026-05-01','401.08.001.000',1000000000,1000000000,'SYSTEM_API','ADMIN001',1,11,'a','Target donasi: Pembangunan Masjid Al-Ikhlas',                 11, NOW());

-- ============================================================
-- SECTION 10: fins_trans — Transaksi penerimaan per invoice PAID
--
-- Keterangan kolom mutasi → via_jurnal:
--   e (e-wallet) → via_jurnal=2
--   2 (bank VA)  → via_jurnal=1
--   4 (QRIS)     → via_jurnal=1
--   3 (manual TF)→ via_jurnal=3
--
-- id_trans format: YYMMDDHHmmss + 6 digit random (18 char)
--
-- Invoice PAID mapping:
--   inv( 4,'2026-05-01 07:09:26') eva/DANA/camp1/200000
--   inv( 5,'2026-05-01 07:14:21') eva/SHOPEEPAY/camp1/200000
--   inv( 6,'2026-05-02 02:01:41') irvan/SHOPEEPAY/camp3/50000
--   inv( 7,'2026-05-02 02:04:11') irvan/SHOPEEPAY/camp6/2500000
--   inv(10,'2026-05-03 03:34:39') irvan/SHOPEEPAY/camp1/500000
--   inv(11,'2026-05-09 14:19:50') irvan/SHOPEEPAY/camp4/35000
--   inv(12,'2026-05-09 14:21:31') irvan/SHOPEEPAY/camp1/500000
--   inv(17,'2026-05-21 13:14:53') irvan/BCA Manual/camp1/100000
--   inv( 5,'2026-10-25 08:00:00') Andi/BCA VA/camp1/150000    [A001]
--   inv( 6,'2026-10-25 09:00:00') Budi/Mandiri VA/camp2/250000[A002]
--   inv( 7,'2026-10-25 10:00:00') Anon/QRIS/camp3/100000      [A003]
--   inv( 8,'2026-10-25 11:00:00') Siti/GoPay/camp4/35000      [A004]
--   inv( 9,'2026-10-25 12:00:00') Andi/BCA VA/camp5/1000000   [A005]
--   inv(10,'2026-10-25 13:00:00') Budi/QRIS/camp6/2500000     [A006]
--   inv(11,'2026-10-25 14:00:00') Siti/QRIS/camp7/3000000     [A007]
--   inv(12,'2026-10-25 15:00:00') Anon/QRIS/camp8/21000000    [A008]
--   inv(13,'2026-10-25 16:00:00') Andi/GoPay/camp9/50000      [A009]
--   inv(14,'2026-10-25 17:00:00') Budi/BCA VA/camp10/415000   [A010]
--   inv(15,'2026-10-25 18:00:00') Siti/Mandiri VA/camp11/500000[A011]
-- ============================================================
INSERT INTO fins_trans (
  id_trans, id_transaksi, id_exre,
  coa_ca, coa_debet, coa_kredit,
  nominal, keterangan, nik_input,
  tgl_exre, fdt, coa, approve, jenis, mutasi,
  id_kantor, id_via_bayar, id_program,
  noresi, total, quantity, kinerja, note,
  crowdfunding_invoice_id, crowdfunding_invoice_created_at
) VALUES
('260501070935123456','INV-20260501-F056DE','INV-20260501-F056DE',
 '401.01.001.000','101.02.004.000','401.01.001.000',
 200000,'Penerimaan Donasi Kesehatan — Bu Dede — eva (DANA)','SYSTEM_API',
 '2026-05-01 07:09:35+00','2026-05-01 07:09:35+00','101.02.004.000','a','r','e',
 1,2,1,'F056DE',200000,1,'Komersil','Webhook Xendit DANA confirmed',
 4,'2026-05-01 07:09:26.8+00'),

('260501073601234567','INV-20260501-325C38','INV-20260501-325C38',
 '401.01.001.000','101.02.004.000','401.01.001.000',
 200000,'Penerimaan Donasi Kesehatan — Bu Dede — eva (ShopeePay)','SYSTEM_API',
 '2026-05-01 07:36:01+00','2026-05-01 07:36:01+00','101.02.004.000','a','r','e',
 1,2,1,'325C38',200000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 5,'2026-05-01 07:14:21.137+00'),

('260502020150345678','INV-20260502-D396FD','INV-20260502-D396FD',
 '401.03.001.000','101.02.004.000','401.03.001.000',
 50000,'Penerimaan Donasi Pangan Banjir — M. Irvan (ShopeePay)','SYSTEM_API',
 '2026-05-02 02:01:50+00','2026-05-02 02:01:50+00','101.02.004.000','a','r','e',
 1,2,3,'D396FD',50000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 6,'2026-05-02 02:01:41.339+00'),

('260502020419456789','INV-20260502-49B97B','INV-20260502-49B97B',
 '401.06.001.000','101.02.004.000','401.06.001.000',
 2500000,'Penerimaan Qurban Kambing — M. Irvan (ShopeePay)','SYSTEM_API',
 '2026-05-02 02:04:19+00','2026-05-02 02:04:19+00','101.02.004.000','a','r','e',
 1,2,6,'49B97B',2500000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 7,'2026-05-02 02:04:11.396+00'),

('260503033448567890','INV-20260503-7127D7','INV-20260503-7127D7',
 '401.01.001.000','101.02.004.000','401.01.001.000',
 500000,'Penerimaan Donasi Kesehatan — Bu Dede — M. Irvan (ShopeePay)','SYSTEM_API',
 '2026-05-03 03:34:48+00','2026-05-03 03:34:48+00','101.02.004.000','a','r','e',
 1,2,1,'7127D7',500000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 10,'2026-05-03 03:34:39.521+00'),

('260509141958678901','INV-20260509-2E9F8C','INV-20260509-2E9F8C',
 '401.04.001.000','101.02.004.000','401.04.001.000',
 35000,'Penerimaan Donasi Sedekah Berbuka — M. Irvan (ShopeePay)','SYSTEM_API',
 '2026-05-09 14:19:58+00','2026-05-09 14:19:58+00','101.02.004.000','a','r','e',
 1,2,4,'2E9F8C',35000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 11,'2026-05-09 14:19:50.708+00'),

('260509142140789012','INV-20260509-EE4C25','INV-20260509-EE4C25',
 '401.01.001.000','101.02.004.000','401.01.001.000',
 500000,'Penerimaan Donasi Kesehatan — Bu Dede — M. Irvan (ShopeePay)','SYSTEM_API',
 '2026-05-09 14:21:40+00','2026-05-09 14:21:40+00','101.02.004.000','a','r','e',
 1,2,1,'EE4C25',500000,1,'Komersil','Webhook Xendit ShopeePay confirmed',
 12,'2026-05-09 14:21:31.158+00'),

('260521131453890123','INV-20260521-9776DD','INV-20260521-9776DD',
 '401.01.001.000','101.02.001.000','401.01.001.000',
 100000,'Penerimaan Donasi Kesehatan — Bu Dede — M. Irvan (BCA Manual)','SYSTEM_API',
 '2026-05-21 13:14:53+00','2026-05-21 13:14:53+00','101.02.001.000','a','r','3',
 1,2,1,'9776DD',100000,1,'Komersil','Konfirmasi manual dengan bukti transfer diterima',
 17,'2026-05-21 13:14:53.327+00'),

-- October 2026 — bulk seed A001..A011
('261025080500901234','INV-20261025-A001','INV-20261025-A001',
 '401.01.001.000','101.02.007.000','401.01.001.000',
 150000,'Penerimaan Donasi Kesehatan — Andi Dermawan (BCA VA)','SYSTEM_API',
 '2026-10-25 08:05:00+00','2026-10-25 08:05:00+00','101.02.007.000','a','r','2',
 1,2,1,'A001901',154000,1,'Komersil','Webhook Xendit VA BCA; admin_fee=4000',
 5,'2026-10-25 08:00:00+00'),

('261025091000012345','INV-20261025-A002','INV-20261025-A002',
 '401.02.002.000','101.02.008.000','401.02.002.000',
 250000,'Penerimaan Donasi Panti Yatim Aceh — Budi Santoso (Mandiri VA)','SYSTEM_API',
 '2026-10-25 09:10:00+00','2026-10-25 09:10:00+00','101.02.008.000','a','r','2',
 1,2,2,'A002012',254000,1,'Komersil','Webhook Xendit VA Mandiri; admin_fee=4000',
 6,'2026-10-25 09:00:00+00'),

('261025100200123456','INV-20261025-A003','INV-20261025-A003',
 '401.03.001.000','101.02.006.000','401.03.001.000',
 100000,'Penerimaan Donasi Pangan Banjir — Hamba Allah (QRIS)','SYSTEM_API',
 '2026-10-25 10:02:00+00','2026-10-25 10:02:00+00','101.02.006.000','a','r','4',
 1,2,3,'A003123',100000,1,'Komersil','Webhook Xendit QRIS; anonim',
 7,'2026-10-25 10:00:00+00'),

('261025110500234567','INV-20261025-A004','INV-20261025-A004',
 '401.04.001.000','101.02.005.000','401.04.001.000',
 35000,'Penerimaan Donasi Sedekah Berbuka — Siti Aminah (GoPay)','SYSTEM_API',
 '2026-10-25 11:05:00+00','2026-10-25 11:05:00+00','101.02.005.000','a','r','e',
 1,2,4,'A004234',35000,1,'Komersil','Webhook Midtrans GoPay confirmed',
 8,'2026-10-25 11:00:00+00'),

('261025121500345678','INV-20261025-A005','INV-20261025-A005',
 '401.05.001.000','101.02.007.000','401.05.001.000',
 1000000,'Penerimaan Zakat Maal — Andi Dermawan (BCA VA)','SYSTEM_API',
 '2026-10-25 12:15:00+00','2026-10-25 12:15:00+00','101.02.007.000','a','r','2',
 1,2,5,'A005345',1004000,1,'Komersil','Webhook Xendit VA BCA; admin_fee=4000',
 9,'2026-10-25 12:00:00+00'),

('261025131000456789','INV-20261025-A006','INV-20261025-A006',
 '401.06.001.000','101.02.006.000','401.06.001.000',
 2500000,'Penerimaan Qurban Kambing — Budi Santoso (QRIS)','SYSTEM_API',
 '2026-10-25 13:10:00+00','2026-10-25 13:10:00+00','101.02.006.000','a','r','4',
 1,2,6,'A006456',2500000,1,'Komersil','Webhook Xendit QRIS confirmed',
 10,'2026-10-25 13:00:00+00'),

('261025141000567890','INV-20261025-A007','INV-20261025-A007',
 '401.06.002.000','101.02.006.000','401.06.002.000',
 3000000,'Penerimaan Qurban Sapi Patungan — Siti Aminah (QRIS)','SYSTEM_API',
 '2026-10-25 14:10:00+00','2026-10-25 14:10:00+00','101.02.006.000','a','r','4',
 1,2,7,'A007567',3000000,1,'Komersil','Webhook Xendit QRIS confirmed',
 11,'2026-10-25 14:00:00+00'),

('261025152000678901','INV-20261025-A008','INV-20261025-A008',
 '401.06.003.000','101.02.006.000','401.06.003.000',
 21000000,'Penerimaan Qurban Sapi Utuh — Anonim (QRIS)','SYSTEM_API',
 '2026-10-25 15:20:00+00','2026-10-25 15:20:00+00','101.02.006.000','a','r','4',
 1,2,8,'A008678',21000000,1,'Komersil','Webhook Xendit QRIS; anonim',
 12,'2026-10-25 15:00:00+00'),

('261025160500789012','INV-20261025-A009','INV-20261025-A009',
 '401.07.001.000','101.02.005.000','401.07.001.000',
 50000,'Penerimaan Infaq Operasional — Andi Dermawan (GoPay)','SYSTEM_API',
 '2026-10-25 16:05:00+00','2026-10-25 16:05:00+00','101.02.005.000','a','r','e',
 1,2,9,'A009789',50000,1,'Komersil','Webhook Midtrans GoPay confirmed',
 13,'2026-10-25 16:00:00+00'),

('261025171500890123','INV-20261025-A010','INV-20261025-A010',
 '401.04.002.000','101.02.007.000','401.04.002.000',
 415000,'Penerimaan Paket Basmalah — Budi Santoso (BCA VA)','SYSTEM_API',
 '2026-10-25 17:15:00+00','2026-10-25 17:15:00+00','101.02.007.000','a','r','2',
 1,2,10,'A010890',419000,1,'Komersil','Webhook Xendit VA BCA; admin_fee=4000',
 14,'2026-10-25 17:00:00+00'),

('261025181000901234','INV-20261025-A011','INV-20261025-A011',
 '401.08.001.000','101.02.008.000','401.08.001.000',
 500000,'Penerimaan Donasi Masjid Al-Ikhlas — Siti Aminah (Mandiri VA)','SYSTEM_API',
 '2026-10-25 18:10:00+00','2026-10-25 18:10:00+00','101.02.008.000','a','r','2',
 1,2,11,'A011901',504000,1,'Komersil','Webhook Xendit VA Mandiri; admin_fee=4000',
 15,'2026-10-25 18:00:00+00');

-- ============================================================
-- SECTION 11: fins_trans reklasifikasi admin fee
--    Untuk invoice dengan admin_fee > 0, kita buat fins_trans
--    terpisah sebagai jurnal reklasifikasi:
--      Debet:  COA Donasi (mengurangi penerimaan bersih)
--      Kredit: COA Biaya Admin 402.01.000.000 (mengakui pendapatan fee)
--    Ini memisahkan base_amount dari fee dalam laporan keuangan.
--    id_trans = main_id_trans + 'F' (19 char, dalam varchar(20))
-- ============================================================
INSERT INTO fins_trans (
  id_trans, id_transaksi, id_exre,
  coa_ca, coa_debet, coa_kredit,
  nominal, keterangan, nik_input,
  tgl_exre, fdt, coa, approve, jenis, mutasi,
  id_kantor, id_via_bayar, id_program,
  noresi, total, quantity, kinerja, note
) VALUES
-- Fee A001: BCA VA, 4000, camp1
('261025080500901234F','INV-20261025-A001','INV-20261025-A001',
 '402.01.000.000','401.01.001.000','402.01.000.000',
 4000,'Reklasifikasi Biaya Admin BCA VA — INV-20261025-A001','SYSTEM_API',
 '2026-10-25 08:05:00+00','2026-10-25 08:05:00+00','401.01.001.000','a','r','',
 1,2,1,'A001901F',4000,1,'Komersil','Admin fee reclassification; base=150000 total=154000'),

-- Fee A002: Mandiri VA, 4000, camp2
('261025091000012345F','INV-20261025-A002','INV-20261025-A002',
 '402.01.000.000','401.02.002.000','402.01.000.000',
 4000,'Reklasifikasi Biaya Admin Mandiri VA — INV-20261025-A002','SYSTEM_API',
 '2026-10-25 09:10:00+00','2026-10-25 09:10:00+00','401.02.002.000','a','r','',
 1,2,2,'A002012F',4000,1,'Komersil','Admin fee reclassification; base=250000 total=254000'),

-- Fee A005: BCA VA, 4000, camp5 (Zakat)
('261025121500345678F','INV-20261025-A005','INV-20261025-A005',
 '402.01.000.000','401.05.001.000','402.01.000.000',
 4000,'Reklasifikasi Biaya Admin BCA VA — INV-20261025-A005','SYSTEM_API',
 '2026-10-25 12:15:00+00','2026-10-25 12:15:00+00','401.05.001.000','a','r','',
 1,2,5,'A005345F',4000,1,'Komersil','Admin fee reclassification; base=1000000 total=1004000'),

-- Fee A010: BCA VA, 4000, camp10 (Paket Basmalah)
('261025171500890123F','INV-20261025-A010','INV-20261025-A010',
 '402.01.000.000','401.04.002.000','402.01.000.000',
 4000,'Reklasifikasi Biaya Admin BCA VA — INV-20261025-A010','SYSTEM_API',
 '2026-10-25 17:15:00+00','2026-10-25 17:15:00+00','401.04.002.000','a','r','',
 1,2,10,'A010890F',4000,1,'Komersil','Admin fee reclassification; base=415000 total=419000'),

-- Fee A011: Mandiri VA, 4000, camp11 (Masjid)
('261025181000901234F','INV-20261025-A011','INV-20261025-A011',
 '402.01.000.000','401.08.001.000','402.01.000.000',
 4000,'Reklasifikasi Biaya Admin Mandiri VA — INV-20261025-A011','SYSTEM_API',
 '2026-10-25 18:10:00+00','2026-10-25 18:10:00+00','401.08.001.000','a','r','',
 1,2,11,'A011901F',4000,1,'Komersil','Admin fee reclassification; base=500000 total=504000');

-- ============================================================
-- SECTION 12: fins_jurnal — Double-entry dari fins_trans
--    via_jurnal: 1=bank/QRIS, 2=ewallet, 3=manual/lain
--    Setiap fins_trans → 2 fins_jurnal (debet + kredit)
--    Constraint: (debet>0 AND kredit=0) OR (debet=0 AND kredit>0)
-- ============================================================
INSERT INTO fins_jurnal (
  id_jurnal, id_transaksi, id_exre,
  coa, debet, kredit, keterangan,
  nik_input, tgl_exre, id_kantor, id_via_bayar,
  jenis, via_jurnal, id_trans, fdt,
  coa_buku, noresi, id_program, kinerja, fins_trans_id
)
-- Debet entries (Bank/Digital menerima dana)
SELECT
  ft.id_trans || '1'                   AS id_jurnal,
  ft.id_transaksi, ft.id_exre,
  ft.coa_debet                         AS coa,
  ft.nominal                           AS debet,
  0                                    AS kredit,
  ft.keterangan,
  ft.nik_input,
  ft.tgl_exre::date,
  ft.id_kantor, ft.id_via_bayar,
  'r'                                  AS jenis,
  CASE ft.mutasi
    WHEN '2' THEN 1 WHEN '4' THEN 1
    WHEN 'e' THEN 2
    ELSE 3
  END                                  AS via_jurnal,
  ft.id_trans,
  ft.fdt,
  ft.coa_kredit                        AS coa_buku,
  ft.noresi, ft.id_program, ft.kinerja, ft.id
FROM fins_trans ft
WHERE ft.approve = 'a'

UNION ALL

-- Kredit entries (COA Penerimaan/Fee dicatat)
SELECT
  ft.id_trans || '2'                   AS id_jurnal,
  ft.id_transaksi, ft.id_exre,
  ft.coa_kredit                        AS coa,
  0                                    AS debet,
  ft.nominal                           AS kredit,
  ft.keterangan,
  ft.nik_input,
  ft.tgl_exre::date,
  ft.id_kantor, ft.id_via_bayar,
  'e'                                  AS jenis,
  CASE ft.mutasi
    WHEN '2' THEN 1 WHEN '4' THEN 1
    WHEN 'e' THEN 2
    ELSE 3
  END                                  AS via_jurnal,
  ft.id_trans,
  ft.fdt,
  ft.coa_debet                         AS coa_buku,
  ft.noresi, ft.id_program, ft.kinerja, ft.id
FROM fins_trans ft
WHERE ft.approve = 'a';

-- ============================================================
-- SECTION 13: fins_invoice_admin_fee
--    Menyimpan relasi invoice → main trans + fee trans
-- ============================================================
INSERT INTO fins_invoice_admin_fee (
  invoice_id, invoice_created_at,
  base_amount, admin_fee, total_amount,
  fins_trans_id, fins_trans_fee_id,
  coa_receipt, coa_fee, coa_bank, payment_method_code
)
SELECT
  ft_main.crowdfunding_invoice_id,
  ft_main.crowdfunding_invoice_created_at,
  ft_main.nominal                                     AS base_amount,
  ft_fee.nominal                                      AS admin_fee,
  ft_main.nominal + ft_fee.nominal                    AS total_amount,
  ft_main.id,
  ft_fee.id,
  ft_main.coa_kredit                                  AS coa_receipt,
  '402.01.000.000'                                    AS coa_fee,
  ft_main.coa_debet                                   AS coa_bank,
  CASE ft_main.coa_debet
    WHEN '101.02.007.000' THEN 'BCA'
    WHEN '101.02.008.000' THEN 'MANDIRI'
    ELSE 'OTHER'
  END                                                 AS payment_method_code
FROM fins_trans ft_main
JOIN fins_trans ft_fee
  ON ft_fee.id_trans = ft_main.id_trans || 'F'
WHERE ft_main.approve = 'a'
  AND ft_main.crowdfunding_invoice_id IS NOT NULL
  AND ft_main.mutasi != '';  -- exclude fee reklasifikasi (mutasi='') sebagai ft_main

-- ============================================================
-- SECTION 14: fins_opname — Rekonsiliasi saldo harian
--    Hitung dari jurnal aktual yang sudah di-insert di atas.
--    per='d' (daily), via='coa' (dari jurnal)
-- ============================================================
INSERT INTO fins_opname (
  tanggal, coa, saldo_awal, debet, kredit,
  adjustment, saldo_akhir, nik_input, id_kantor,
  id_via_bayar, active, per, via, keterangan, dtu
)
WITH jurnal_summary AS (
  SELECT
    tgl_exre                                  AS tanggal,
    coa,
    COALESCE(SUM(debet),  0)                  AS total_debet,
    COALESCE(SUM(kredit), 0)                  AS total_kredit
  FROM fins_jurnal
  WHERE jenis = 'r'   -- sisi debet (penerimaan bank)
  GROUP BY tgl_exre, coa
),
opname_base AS (
  SELECT
    js.tanggal,
    js.coa,
    js.total_debet,
    js.total_kredit,
    COALESCE(
      SUM(js2.total_debet - js2.total_kredit)
        FILTER (WHERE js2.tanggal < js.tanggal),
      0
    ) AS saldo_awal
  FROM jurnal_summary js
  LEFT JOIN jurnal_summary js2 ON js2.coa = js.coa AND js2.tanggal < js.tanggal
  GROUP BY js.tanggal, js.coa, js.total_debet, js.total_kredit
)
SELECT
  tanggal,
  coa,
  saldo_awal,
  total_debet,
  total_kredit,
  0                                           AS adjustment,
  saldo_awal + total_debet - total_kredit     AS saldo_akhir,
  'SYSTEM_CRON',
  1,
  '0',
  'y',
  'd',
  'coa',
  'Opname harian otomatis dari jurnal',
  NOW()
FROM opname_base
-- Hanya asset accounts (debet normal) yang perlu opname harian
WHERE coa LIKE '101.%'
ON CONFLICT (tanggal, coa, id_kantor, per, via) DO UPDATE SET
  saldo_awal  = EXCLUDED.saldo_awal,
  debet       = EXCLUDED.debet,
  kredit      = EXCLUDED.kredit,
  saldo_akhir = EXCLUDED.saldo_akhir,
  updated     = NOW();

-- Opname bulanan (per='m') — agregasi dari harian di atas
INSERT INTO fins_opname (
  tanggal, coa, saldo_awal, debet, kredit,
  adjustment, saldo_akhir, nik_input, id_kantor,
  id_via_bayar, active, per, via, keterangan, dtu
)
WITH monthly_agg AS (
  SELECT
    DATE_TRUNC('month', tgl_exre)::date       AS tanggal,
    coa,
    COALESCE(SUM(debet),  0)                  AS total_debet,
    COALESCE(SUM(kredit), 0)                  AS total_kredit
  FROM fins_jurnal
  WHERE jenis = 'r' AND coa LIKE '101.%'
  GROUP BY DATE_TRUNC('month', tgl_exre), coa
)
SELECT
  tanggal,
  coa,
  0                                           AS saldo_awal,
  total_debet,
  total_kredit,
  0,
  total_debet - total_kredit                  AS saldo_akhir,
  'SYSTEM_CRON',
  1,
  '0',
  'y',
  'm',
  'coa',
  'Opname bulanan otomatis',
  NOW()
FROM monthly_agg
ON CONFLICT (tanggal, coa, id_kantor, per, via) DO UPDATE SET
  debet       = EXCLUDED.debet,
  kredit      = EXCLUDED.kredit,
  saldo_akhir = EXCLUDED.saldo_akhir,
  updated     = NOW();

-- ============================================================
-- SECTION 15: fins_campaign_budget_summary — Hitung dari jurnal
-- ============================================================
INSERT INTO fins_campaign_budget_summary (
  campaign_id, target_amount, collected_amount,
  fins_jurnal_count, last_donation_at, last_synced_at
)
SELECT
  fcc.campaign_id,
  COALESCE(c.target_amount, 0),
  COALESCE(SUM(fj.kredit), 0)::bigint,
  COUNT(fj.id)::int,
  MAX(fj.fdt),
  NOW()
FROM fins_campaign_coa fcc
JOIN campaigns c ON c.id = fcc.campaign_id
LEFT JOIN fins_jurnal fj
  ON fj.coa = fcc.coa_receipt AND fj.jenis = 'e'
WHERE fcc.is_primary = true
GROUP BY fcc.campaign_id, c.target_amount
ON CONFLICT (campaign_id) DO UPDATE SET
  target_amount     = EXCLUDED.target_amount,
  collected_amount  = EXCLUDED.collected_amount,
  fins_jurnal_count = EXCLUDED.fins_jurnal_count,
  last_donation_at  = EXCLUDED.last_donation_at,
  last_synced_at    = EXCLUDED.last_synced_at;

-- ============================================================
-- SECTION 16: fins_upstash_events — Log semua PAID events
-- ============================================================
INSERT INTO fins_upstash_events (
  event_type, entity_type, entity_id, entity_ref,
  payload, status, processed_at, created_at, updated_at
)
SELECT
  'INVOICE_PAID',
  'invoice',
  ft.crowdfunding_invoice_id,
  ft.id_transaksi,
  jsonb_build_object(
    'invoice_id',               ft.crowdfunding_invoice_id,
    'invoice_created_at',       ft.crowdfunding_invoice_created_at,
    'invoice_code',             ft.id_transaksi,
    'fins_trans_id',            ft.id,
    'fins_trans_code',          ft.id_trans,
    'nominal',                  ft.nominal,
    'total',                    ft.total,
    'coa_debet',                ft.coa_debet,
    'coa_kredit',               ft.coa_kredit,
    'mutasi',                   ft.mutasi,
    'id_program',               ft.id_program
  ),
  'SUCCESS',
  ft.fdt,
  ft.dtu,
  NOW()
FROM fins_trans ft
WHERE ft.crowdfunding_invoice_id IS NOT NULL
  AND ft.approve = 'a'
  AND ft.mutasi != '';  -- skip fee reklasifikasi

-- Log fee reclassification events
INSERT INTO fins_upstash_events (
  event_type, entity_type, entity_id, entity_ref,
  payload, status, processed_at, created_at, updated_at
)
SELECT
  'INVOICE_ADMIN_FEE_RECLASSIFIED',
  'fins_trans',
  ft.id,
  ft.id_trans,
  jsonb_build_object(
    'id_trans',           ft.id_trans,
    'id_transaksi',       ft.id_transaksi,
    'admin_fee',          ft.nominal,
    'coa_debet',          ft.coa_debet,
    'coa_kredit',         ft.coa_kredit
  ),
  'SUCCESS',
  ft.fdt,
  ft.dtu,
  NOW()
FROM fins_trans ft
WHERE ft.mutasi = ''  -- fee reklasifikasi entries
  AND ft.approve = 'a';

-- ============================================================
-- SECTION 17: UPDATE invoices.fins_trans_id
--    Tautkan setiap invoice PAID ke fins_trans yang sesuai
-- ============================================================
UPDATE invoices i
SET fins_trans_id = ft.id
FROM fins_trans ft
WHERE ft.crowdfunding_invoice_id = i.id
  AND ft.crowdfunding_invoice_created_at = i.created_at
  AND ft.mutasi != '';  -- hanya main trans (bukan fee reklasifikasi)
