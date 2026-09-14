-- ============================================================
-- Tambahan COA untuk modul NGO baru
-- Prasyarat: 04_fins_seed_aligned.sql sudah berjalan
-- Semua INSERT menggunakan ON CONFLICT DO NOTHING
-- ============================================================

-- ── L3: Piutang & Aset Detail ────────────────────────────────
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('101.04.000.000','Piutang Usaha & Staf',        '101.00.000.000',3,'3','y','y','y','d','Kas bon staf, piutang vendor, piutang grant',NOW()),
('101.05.000.000','Dana Dalam Perjalanan',        '101.00.000.000',3,'3','y','y','y','d','In-transit antar rekening internal',NOW()),
('101.06.000.000','Uang Muka Pembelian',          '101.00.000.000',3,'3','y','y','y','d','Down payment ke vendor',NOW()),
('102.02.000.000','Hewan Qurban (Persediaan)',    '102.00.000.000',3,'1','y','y','y','d','Nilai hewan qurban yang sudah dibeli belum disalurkan',NOW()),
('102.99.000.000','Akumulasi Penyusutan',         '102.00.000.000',3,'1','y','y','y','k','Contra-asset penyusutan aset tetap',NOW()),
('201.03.000.000','Hutang Usaha',                 '201.00.000.000',3,'2','y','y','y','k','Tagihan vendor belum dibayar',NOW()),
('201.04.000.000','Hutang PPh 21',                '201.00.000.000',3,'2','y','y','y','k','PPh karyawan belum disetorkan',NOW()),
('201.05.000.000','Hutang Gaji',                  '201.00.000.000',3,'2','y','y','y','k','Gaji bulan berjalan belum dibayarkan',NOW()),
('201.06.000.000','Dana Amil Belum Disalurkan',   '201.00.000.000',3,'2','y','y','y','k','Bagian amil dari zakat, belum diakui',NOW()),
('300.06.000.000','Aset Bersih Tidak Terikat',    '300.00.000.000',3,'3','y','y','y','k','PSAK 45: dana bebas digunakan',NOW()),
('300.07.000.000','Aset Bersih Terikat Sementara','300.00.000.000',3,'3','y','y','y','k','PSAK 45: terikat waktu/tujuan',NOW()),
('300.08.000.000','Aset Bersih Terikat Permanen', '300.00.000.000',3,'3','y','y','y','k','PSAK 45: endowment/wakaf permanen',NOW()),
('401.09.000.000','Penerimaan Hibah & Grant',     '401.00.000.000',3,'4','y','y','y','k','Hibah dari BAZNAS, pemerintah, lembaga asing',NOW()),
('401.10.000.000','Bagian Amil dari Zakat',       '401.00.000.000',3,'4','n','y','y','k','12.5% dari zakat diterima sebagai hak amil',NOW()),
('502.04.000.000','Beban Gaji & Tunjangan',       '502.00.000.000',3,'5','y','y','y','d','Gaji pokok + tunjangan semua karyawan',NOW()),
('502.05.000.000','Beban PPh 21',                 '502.00.000.000',3,'5','n','y','y','d','Pajak penghasilan karyawan ditanggung yayasan',NOW()),
('502.06.000.000','Beban Penyusutan Aset Tetap',  '502.00.000.000',3,'5','n','y','y','d','Beban penyusutan bulanan aset tetap',NOW()),
('502.07.000.000','Beban ATK & Perlengkapan',     '502.00.000.000',3,'5','n','y','y','d','Alat tulis kantor dan perlengkapan operasional',NOW()),
('502.08.000.000','Beban Sewa',                   '502.00.000.000',3,'5','n','y','y','d','Sewa kantor, gudang, kendaraan',NOW()),
('502.09.000.000','Beban Listrik, Air & Internet','502.00.000.000',3,'5','n','y','y','d','Utilitas kantor',NOW()),
('502.10.000.000','Beban Transportasi',           '502.00.000.000',3,'5','n','y','y','d','BBM, toll, transport staf lapangan',NOW()),
('502.11.000.000','Beban Pelatihan & SDM',        '502.00.000.000',3,'5','n','y','y','d','Training, seminar, pengembangan staf',NOW())
ON CONFLICT (coa) DO NOTHING;

-- ── L4: Detail piutang, hutang, hibah, gaji ──────────────────
INSERT INTO fins_coa (coa,nama_coa,coa_parent,level,group_coa,parent,active,is_default,saldo,keterangan,dtu) VALUES
('101.04.001.000','Kas Bon / Piutang Staf',          '101.04.000.000',4,'3','n','y','y','d','Uang muka kerja belum dipertanggungjawabkan',NOW()),
('101.04.002.000','Piutang Uang Muka Vendor',        '101.04.000.000',4,'3','n','y','y','d','DP ke vendor PO belum selesai',NOW()),
('101.04.003.000','Piutang Hibah / Grant',           '101.04.000.000',4,'3','n','y','y','d','Grant disetujui belum cair',NOW()),
('101.05.001.000','In-Transit Transfer Antar Rekening','101.05.000.000',4,'3','n','y','y','d','Dana dikirim, belum diterima rekening tujuan',NOW()),
('102.02.001.000','Hewan Qurban — Kambing',          '102.02.000.000',4,'1','n','y','y','d','Nilai kambing sudah dibeli, belum disalurkan',NOW()),
('102.02.002.000','Hewan Qurban — Sapi',             '102.02.000.000',4,'1','n','y','y','d','Nilai sapi sudah dibeli, belum disalurkan',NOW()),
('102.99.001.000','Akumulasi Penyusutan Peralatan',  '102.99.000.000',4,'1','n','y','y','k','',NOW()),
('401.09.001.000','Hibah BAZNAS',                    '401.09.000.000',4,'4','n','y','y','k','',NOW()),
('401.09.002.000','Hibah Pemerintah / APBD',         '401.09.000.000',4,'4','n','y','y','k','',NOW()),
('401.09.003.000','Hibah Lembaga Internasional',     '401.09.000.000',4,'4','n','y','y','k','',NOW()),
('502.04.001.000','Gaji Pokok Karyawan',             '502.04.000.000',4,'5','n','y','y','d','',NOW()),
('502.04.002.000','Tunjangan Makan & Transport',     '502.04.000.000',4,'5','n','y','y','d','',NOW()),
('502.04.003.000','THR & Bonus',                     '502.04.000.000',4,'5','n','y','y','d','',NOW())
ON CONFLICT (coa) DO NOTHING;

-- Update fins_saldo_dana untuk dana amil
INSERT INTO fins_saldo_dana (coa_dana, coa_expend, coa_receipt, ops, dtu) VALUES
('300.06.000.000','502.00.000.000','401.09.000.000,401.10.000.000','y',NOW()),
('300.07.000.000','501.00.000.000','401.01.000.000,401.02.000.000,401.03.000.000,401.04.000.000,401.05.000.000,401.06.000.000,401.07.000.000,401.08.000.000','n',NOW()),
('300.08.000.000','','401.09.000.000','n',NOW())
ON CONFLICT (coa_dana) DO NOTHING;
