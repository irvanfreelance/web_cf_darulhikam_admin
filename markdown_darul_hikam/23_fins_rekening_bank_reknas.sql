-- ============================================================================
-- 23_fins_rekening_bank_reknas.sql
-- FINS > Home > Setting Configuration > Rekening Bank
-- Full replacement of fins_bank_rek with the organization's real "Reknas"
-- (rekening nasional) bank account list, applied to the live Neon DB on
-- 2026-09-13. "Percikan Iman" and "PI SEDEKAHKU" wording stripped from
-- descriptions per request.
-- ============================================================================

-- New institution codes not previously in fins_bank (e-wallets/BCA Syariah
-- kept distinct from the existing generic 'MID'/'XND'/'014' entries used
-- elsewhere, so this doesn't rename shared Kode Bank master data).
INSERT INTO fins_bank (id_bank, bank, description_code) VALUES
  ('LKJ', 'LINKAJA', ''),
  ('SPY', 'Shopeepay', ''),
  ('MTR', 'Midtrans', ''),
  ('XDT', 'Xendit', ''),
  ('BCS', 'BANK BCA Syariah', '')
ON CONFLICT (id_bank) DO NOTHING;

-- New leaf COA accounts referenced by the rekening below (fins_bank_rek.coa
-- has a FK to fins_coa).
INSERT INTO fins_coa (coa, nama_coa, coa_parent, level, group_coa, parent, active, is_default, saldo) VALUES
  ('101.02.001.001', 'Penerimaan Reknas — BRI',                    '101.02.001.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.001.002', 'BSI ZAKAT Reknas',                           '101.02.001.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.001.003', 'Penerimaan Reknas — Mandiri',                '101.02.001.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.001.004', 'Amil — Mandiri Reknas',                      '101.02.001.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.001', 'Mandiri Reknas',                             '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.002', 'BSI Payroll',                                '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.003', 'BSI SEDEKAHKU Reknas',                       '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.004', 'BSI Sisa Salur',                             '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.005', 'BSI Penyaluran',                             '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.006', 'BSI INFAK Reknas',                           '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.007', 'BSI KEMANUSIAAN Reknas',                     '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.008', 'BSI Infak Sedekah Peradaban Reknas',         '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.009', 'BSI DSKL Reknas',                            '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.010', 'BCA Syariah SMB Reknas',                     '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.011', 'BCA Syariah SIP Reknas',                     '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.002.012', 'INFAK DAKWAH SEDEKAHKU Reknas',              '101.02.002.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.099.000', 'Rekening Virtual / E-Wallet',                '101.02.000.000', 4, '3', 'y', 'y', 'y', 'd'),
  ('101.02.099.001', 'Midtrans',                                   '101.02.099.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.099.002', 'LinkAja',                                    '101.02.099.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.099.003', 'Shopeepay',                                  '101.02.099.000', 5, '3', 'n', 'y', 'y', 'd'),
  ('101.02.099.004', 'Xendit',                                     '101.02.099.000', 5, '3', 'n', 'y', 'y', 'd')
ON CONFLICT (coa) DO NOTHING;

-- 101.02.001.000 (BCA) and 101.02.002.000 (Mandiri) now have children, so
-- they're headers, not leaves.
UPDATE fins_coa SET parent = 'y' WHERE coa IN ('101.02.001.000', '101.02.002.000');

-- Full replace of the rekening list.
DELETE FROM fins_bank_rek;

INSERT INTO fins_bank_rek (id_rekening, id_bank, keterangan, coa, scrap, active, note) VALUES
  ('130101000013305',  '002', 'Penerimaan Reknas',                        '101.02.001.001', 'n', 'y', ''),
  ('8889595958',        'BSI', 'BSI ZAKAT Reknas',                        '101.02.001.002', 'y', 'y', ''),
  ('1300095092022',     '008', 'Penerimaan Reknas',                       '101.02.001.003', 'y', 'y', ''),
  ('1300079092022',     '008', 'Mandiri Reknas',                          '101.02.002.001', 'y', 'y', ''),
  ('10102099001',       'MTR', 'Midtrans',                                '101.02.099.001', 'n', 'y', ''),
  ('10102099002',       'LKJ', 'Link Aja',                                '101.02.099.002', 'n', 'y', ''),
  ('10102099003',       'SPY', 'Shopeepay',                               '101.02.099.003', 'n', 'y', ''),
  ('10102099004',       'XDT', 'Xendit',                                  '101.02.099.004', 'n', 'y', ''),
  ('1300087092022',     '008', 'Amil',                                    '101.02.001.004', 'n', 'y', ''),
  ('8889292939',        'BSI', 'BSI Penyaluran',                          '101.02.002.005', 'n', 'y', ''),
  ('8889393937',        'BSI', 'BSI Sisa Salur',                          '101.02.002.004', 'n', 'y', ''),
  ('8889494949',        'BSI', 'BSI SEDEKAHKU Reknas',                    '101.02.002.003', 'y', 'y', ''),
  ('8889292928',        'BSI', 'BSI Payroll',                             '101.02.002.002', 'n', 'y', ''),
  ('8809998817',        'BSI', 'BSI INFAK Reknas',                        '101.02.002.006', 'y', 'y', ''),
  ('8809998828',        'BSI', 'BSI KEMANUSIAAN Reknas',                  '101.02.002.007', 'y', 'y', ''),
  ('8809998836',        'BSI', 'BSI Infak Sedekah Peradaban Reknas',      '101.02.002.008', 'y', 'y', ''),
  ('8809998844',        'BSI', 'BSI DSKL Reknas',                         '101.02.002.009', 'y', 'y', ''),
  ('0354333999',        'BCS', 'BCA Syariah SMB 0354333999 Reknas',       '101.02.002.010', 'y', 'y', ''),
  ('0359444999',        'BCS', 'BCA Syariah SIP 0359444999 Reknas',       '101.02.002.011', 'y', 'y', ''),
  ('7307690448',        'BSI', 'INFAK DAKWAH SEDEKAHKU 7307690448 Reknas','101.02.002.012', 'y', 'y', '');
