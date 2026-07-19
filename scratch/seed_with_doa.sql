-- Additional Seed Data with Doa
-- This script adds invoices and transactions for all campaigns, including the 'doa' field.

-- Clear existing data if necessary or just append
-- For seeding purpose, we usually want a clean state for the demo data

DELETE FROM transactions WHERE id > 4;
DELETE FROM invoices WHERE id > 4;

INSERT INTO "public"."invoices" ("id", "invoice_code", "donor_id", "payment_method_id", "donor_name_snapshot", "donor_email", "donor_phone", "is_anonymous", "base_amount", "admin_fee", "total_amount", "status", "va_number", "created_at", "paid_at", "doa") VALUES
(5, 'INV-20261025-A001', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 150000, 4000, 154000, 'PAID', '807708123456789', '2026-10-25 08:00:00+00', '2026-10-25 08:05:00+00', 'Semoga Adik Rina cepat sembuh dan bisa sekolah lagi, semangat terus ya dek!'),
(6, 'INV-20261025-A002', 2, 3, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 250000, 4000, 254000, 'PAID', '888808567890123', '2026-10-25 09:00:00+00', '2026-10-25 09:10:00+00', 'Semoga pembangunan sekolah di NTT lancar dan jadi amal jariyah untuk kita semua.'),
(7, 'INV-20261025-A003', NULL, 5, 'Hamba Allah', NULL, NULL, 't', 100000, 0, 100000, 'PAID', NULL, '2026-10-25 10:00:00+00', '2026-10-25 10:02:00+00', 'Semoga saudara kita korban banjir diberi ketabahan dan kekuatan.'),
(8, 'INV-20261025-A004', 3, 1, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 35000, 0, 35000, 'PAID', NULL, '2026-10-25 11:00:00+00', '2026-10-25 11:05:00+00', 'Semoga nasi box ini berkah untuk yang menerima.'),
(9, 'INV-20261025-A005', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 1000000, 4000, 1004000, 'PAID', '807708123456789', '2026-10-25 12:00:00+00', '2026-10-25 12:15:00+00', 'Zakat maal untuk membersihkan harta tahun ini.'),
(10, 'INV-20261025-A006', 2, 5, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 2500000, 0, 2500000, 'PAID', NULL, '2026-10-25 13:00:00+00', '2026-10-25 13:10:00+00', 'Bismillah, qurban kambing atas nama Bapak Budi Santoso.'),
(11, 'INV-20261025-A007', 3, 5, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 3000000, 0, 3000000, 'PAID', NULL, '2026-10-25 14:00:00+00', '2026-10-25 14:10:00+00', 'Patungan qurban sapi, semoga bermanfaat untuk warga pedalaman.'),
(12, 'INV-20261025-A008', NULL, 5, 'Anonim', NULL, NULL, 't', 21000000, 0, 21000000, 'PAID', NULL, '2026-10-25 15:00:00+00', '2026-10-25 15:20:00+00', 'Qurban 1 ekor sapi utuh untuk kebaikan bersama.'),
(13, 'INV-20261025-A009', 1, 1, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 50000, 0, 50000, 'PAID', NULL, '2026-10-25 16:00:00+00', '2026-10-25 16:05:00+00', 'Sedikit infaq untuk operasional yayasan.'),
(14, 'INV-20261025-A010', 2, 2, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 415000, 4000, 419000, 'PAID', '807708567890123', '2026-10-25 17:00:00+00', '2026-10-25 17:15:00+00', 'Paket kado yatim, semoga mereka bahagia di hari lebaran.'),
(15, 'INV-20261025-A011', 3, 3, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 500000, 4000, 504000, 'PAID', '888808198765432', '2026-10-25 18:00:00+00', '2026-10-25 18:10:00+00', 'Untuk pembangunan masjid Al-Ikhlas, semoga segera tegak berdiri.');

-- Partition table
INSERT INTO "public"."invoices_y2026m10" SELECT * FROM invoices WHERE id > 4;

-- Transactions
INSERT INTO "public"."transactions" ("id", "invoice_id", "invoice_created_at", "campaign_id", "qty", "amount", "created_at") VALUES
(5, 5, '2026-10-25 08:00:00+00', 1, 1, 150000, '2026-10-25 08:00:00+00'),
(6, 6, '2026-10-25 09:00:00+00', 2, 1, 250000, '2026-10-25 09:00:00+00'),
(7, 7, '2026-10-25 10:00:00+00', 3, 1, 100000, '2026-10-25 10:00:00+00'),
(8, 8, '2026-10-25 11:00:00+00', 4, 1, 35000, '2026-10-25 11:00:00+00'),
(9, 9, '2026-10-25 12:00:00+00', 5, 1, 1000000, '2026-10-25 12:00:00+00'),
(10, 10, '2026-10-25 13:00:00+00', 6, 1, 2500000, '2026-10-25 13:00:00+00'),
(11, 11, '2026-10-25 14:00:00+00', 7, 1, 3000000, '2026-10-25 14:00:00+00'),
(12, 12, '2026-10-25 15:00:00+00', 8, 1, 21000000, '2026-10-25 15:00:00+00'),
(13, 13, '2026-10-25 16:00:00+00', 9, 1, 50000, '2026-10-25 16:00:00+00'),
(14, 14, '2026-10-25 17:00:00+00', 10, 1, 415000, '2026-10-25 17:00:00+00'),
(15, 15, '2026-10-25 18:00:00+00', 11, 1, 500000, '2026-10-25 18:00:00+00');

-- Partition table
INSERT INTO "public"."transactions_y2026m10" SELECT * FROM transactions WHERE id > 4;

-- Reset sequences
SELECT setval('invoices_id_seq', (SELECT MAX(id) FROM invoices));
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
