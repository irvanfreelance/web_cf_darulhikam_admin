# Menu Page Admin Panel — Akuntansi NGO Lengkap

## Keterangan
- **Menu Utama** = item di sidebar navigasi
- **Tab** = halaman dalam satu menu (tab switcher)
- `[tabel]` = tabel database yang digunakan
- `[CONFIG]` = hak akses terbatas Finance Admin / Super Admin
- `[STAFF]` = Finance Staff
- `[MANAGER]` = Finance Manager (approval)
- `[READONLY]` = semua role finance bisa akses

---

## 🔄 OPERASIONAL

### 1. Transaksi Keuangan `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Penerimaan | List transaksi donasi masuk, filter periode/COA/channel, approve/reject, link ke invoice | `fins_trans` jenis=r |
| Pengeluaran | List transaksi keluar (penyaluran, operasional), input manual, approve/reject | `fins_trans` jenis=e |
| Jurnal Umum | Buku besar double-entry, filter COA + periode, running balance per COA | `fins_jurnal` |
| Opname & Saldo | Rekonsiliasi saldo kas/bank harian/bulanan/tahunan, input adjustment | `fins_opname` |

---

### 2. Penyaluran Dana `[MANAGER]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Pengajuan | List pengajuan penyaluran, workflow draft→submitted→approved→disbursed, filter status/campaign | `disbursement_requests` |
| Item & Rincian | Detail item per pengajuan: qty, satuan, harga, COA, subtotal | `disbursement_items` |
| Bukti Realisasi | Upload & lihat foto/dokumen/BA/kwitansi bukti penyaluran sudah terealisasi | `disbursement_proofs` |
| Penerima Massal | Daftar penerima per penyaluran (pangan, berbuka, dll), tanda terima digital | `disbursement_recipients` |

---

### 3. Pengeluaran Operasional `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Reimbursement / Expense | Pengajuan pengeluaran staf: form, rincian item, upload struk, workflow approval | `expense_requests` + `expense_items` |
| Kas Bon | Pengajuan uang muka staf, tracking settlement, sisa kas bon, status overdue | `cash_advances` |
| Purchase Order | PO ke vendor: draft, approval, received, pelunasan, link ke fins_trans | `purchase_orders` + `po_items` |
| Kas Kecil | Buku kas kecil per kantor, transaksi harian, rekap bulanan ke jurnal | `petty_cash_books` + `petty_cash_transactions` |

---

### 4. Anggaran & Realisasi `[MANAGER]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Anggaran | List anggaran per COA per campaign, input anggaran baru, approval, % serapan vs realisasi | `fins_budget` |
| Realisasi Campaign | Progress bar % terkumpul vs target per campaign, jumlah transaksi, tombol sync ulang | `fins_campaign_budget_summary` |
| Admin Fee Invoice | Split base_amount vs admin_fee per invoice, status reklasifikasi jurnal, filter channel | `fins_invoice_admin_fee` |

---

### 5. Aset Tetap `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Register Aset | CRUD aset, kode aset, metode penyusutan, masa manfaat, nilai buku saat ini | `fins_aset` |
| Jadwal Penyusutan | Tabel susut per bulan per aset, status posted/scheduled, tombol post manual | `asset_depreciation_schedules` |

---

### 6. Hutang & Piutang `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Hutang Usaha | Daftar hutang ke vendor, aging (0-30/31-60/61-90/90+ hari), status bayar, link PO | `payables` |
| Piutang | Piutang non-donasi: grant cair, pinjaman, titipan, status outstanding/collected | `receivables` |
| Transfer Antar Rekening | Transfer internal antar rekening sendiri, status in-transit, bukti transfer | `internal_transfers` |

---

### 7. Program Qurban `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Register Hewan | Daftar hewan per campaign, status (dipesan→dibeli→disembelih→didistribusikan), foto | `qurban_animals` |
| Peserta (Shahibul) | Daftar shohibul per hewan, atas nama, link invoice, cetak sertifikat qurban | `qurban_shahibul` |
| Distribusi | Lokasi distribusi daging, koordinat, jumlah paket, foto distribusi, BA | `qurban_distributions` |

---

### 8. Program Zakat `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Penyaluran per Asnaf | Distribusi ke 8 asnaf, jumlah penerima, lokasi, link disbursement, bukti | `zakat_distributions` |
| Hak Amil | Kalkulasi 12.5% per periode, status (calculated→approved→disbursed), jurnal pengakuan | `zakat_amil_fee` |

---

### 9. Grant & Hibah `[MANAGER]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Master Grant | Daftar grant aktif/selesai, pemberi, total, terpakai, sisa, jenis dana PSAK 45 | `grants` |
| Pencairan | Jadwal & realisasi pencairan per tahap, status, link fins_trans | `grant_disbursements` |
| Lap. Pertanggungjawaban | Upload & submit laporan ke pemberi grant, status accepted/revision | `grant_reports` |
| Piutang Grant | Grant disetujui belum cair, filter dari receivables jenis=grant | `receivables` |

---

### 10. SDM & Penggajian `[MANAGER]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Master Karyawan | CRUD karyawan, jabatan, PTKP, rekening gaji, status kerja | `employees` |
| Penggajian Bulanan | Hitung gaji per periode, slip gaji per karyawan, approval, fins_trans gaji | `payroll_periods` + `payroll_items` |
| Bukti Potong PPh 21 | Generate bukpot per karyawan per tahun, PDF, status kirim | `tax_withholding` |

---

## ⚙️ KONFIGURASI

### 11. Master Data Keuangan `[CONFIG]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Bank | CRUD master bank dan payment gateway | `fins_bank` |
| Rekening & Channel | CRUD rekening nyata dan settlement channel (Xendit/Midtrans), link COA | `fins_bank_rek` |
| Chart of Accounts | Tree view 4 level, CRUD, toggle aktif/nonaktif, validasi parent-leaf | `fins_coa` |
| Mapping Dana | Mapping COA ekuitas (300.xx) ke daftar COA penerimaan + pengeluaran | `fins_saldo_dana` |

---

### 12. Konfigurasi Program `[CONFIG]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| COA per Campaign | Set COA receipt, fund, expense per campaign crowdfunding | `fins_campaign_coa` |
| Penerima Manfaat | Master beneficiary: verifikasi, NIK, kategori, status ekonomi, foto KTP | `beneficiaries` |
| Vendor / Supplier | CRUD vendor, NPWP, rekening, TOP, kategori | `vendors` |

---

### 13. Pengaturan Laporan `[CONFIG]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Struktur Baris Laporan | CRUD baris per jenis laporan (LPK/LPO/LPD/LAK/LA), drag-and-drop sort | `fins_report` |
| CALK | Input Catatan Atas Laporan Keuangan per periode, nomor catatan, isi | `fins_calk_notes` |

---

### 14. Periode Akuntansi `[CONFIG]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Daftar Periode | List periode bulanan, status (open/closing/closed), proses tutup buku, summary | `accounting_periods` |
| Jurnal Penyesuaian | AJE: akrual, depresiasi, koreksi, penutup, reversal per periode | `period_adjusting_entries` |

---

## 📊 LAPORAN

### 15. Laporan Keuangan PSAK 45 `[READONLY]`
| Tab | Deskripsi | Sumber Data |
|---|---|---|
| Laporan Posisi Keuangan (LPK) | Balance sheet NGO: aset, kewajiban, dana/ekuitas, komparasi 2 periode | `fins_report` + `fins_jurnal` |
| Laporan Aktivitas (LA) | Pengganti P&L NGO: perubahan aset bersih TK/TS/TP per periode | `fins_report` + `fins_net_asset_changes` |
| Laporan Arus Kas (LAK) | Operasi, investasi, pendanaan; saldo kas awal & akhir | `fins_report` + `fins_jurnal` |
| Perubahan Aset Bersih | Tabel perubahan TK/TS/TP per bulan/tahun, pelepasan batasan | `fins_net_asset_changes` |
| Buku Besar per COA | Pilih COA, rentang tanggal, running balance, export PDF | `fins_jurnal` |

---

### 16. Laporan Donasi & Program `[READONLY]`
| Tab | Deskripsi | Sumber Data |
|---|---|---|
| Penerimaan Donasi (LPD) | Per campaign, per kategori, per channel payment, grafik trend | `fins_jurnal` + `fins_report` |
| Realisasi Penyaluran | Realisasi vs anggaran vs target campaign, % serapan, gap analisis | `disbursement_requests` + `fins_budget` |
| Laporan Qurban | Per campaign, per hewan, per lokasi distribusi, jumlah peserta | `qurban_animals` + `qurban_distributions` |
| Laporan Zakat & Asnaf | Total per asnaf, perbandingan penerimaan vs penyaluran, hak amil | `zakat_distributions` + `zakat_amil_fee` |
| Sertifikat Donasi | Generate & kirim sertifikat donasi tahunan per donatur, status kirim | `donation_certificates` |

---

### 17. Laporan Operasional `[READONLY]`
| Tab | Deskripsi | Sumber Data |
|---|---|---|
| Pengeluaran per COA | Rekapitulasi biaya operasional per COA per periode, filter departemen | `expense_requests` + `fins_jurnal` |
| Aging Hutang | Hutang usaha dikelompokkan 0-30/31-60/61-90/90+ hari, per vendor | `payables` |
| Piutang Outstanding | Piutang belum tertagih, umur piutang, flag overdue | `receivables` |
| Aset & Penyusutan | Nilai buku aset saat ini, akumulasi susut, jadwal susut ke depan | `fins_aset` + `asset_depreciation_schedules` |
| Kas Bon Belum Settlement | Staf yang masih punya kas bon aktif, jatuh tempo, jumlah, status | `cash_advances` |

---

### 18. Laporan Grant `[READONLY]`
| Tab | Deskripsi | Sumber Data |
|---|---|---|
| Realisasi per Grant | Pencairan vs total grant, penggunaan vs pencairan, sisa dana | `grants` + `grant_disbursements` |
| Dana Terikat vs Tidak Terikat | Posisi dana berdasarkan klasifikasi PSAK 45 | `fins_fund_restrictions` |
| Status Pelaporan | Grant yang laporan pertanggungjawabannya jatuh tempo / terlambat | `grant_reports` |

---

### 19. Laporan SDM `[READONLY]`
| Tab | Deskripsi | Sumber Data |
|---|---|---|
| Rekap Penggajian | Total gaji bruto, PPh 21, bersih per bulan, tren 12 bulan | `payroll_periods` |
| Slip Gaji | Per karyawan per bulan, download PDF | `payroll_items` |
| PPh 21 | Rekap setoran PPh 21 per bulan, bukpot tahunan per karyawan | `tax_withholding` |

---

## 👁️ MONITORING

### 20. Rekonsiliasi Bank `[STAFF]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Import Statement | Upload CSV/XLSX mutasi rekening, preview, konfirmasi import per batch | `bank_statements` |
| Pencocokan | Match statement vs fins_jurnal: auto-match, manual match, exception | `bank_reconciliation_items` |
| Laporan Rekon | Summary selisih per rekening per periode, status submitted/approved | `bank_reconciliation_reports` |

---

### 21. Monitoring Sistem `[CONFIG]`
| Tab | Deskripsi | Tabel |
|---|---|---|
| Upstash Events | Status PENDING/RETRYING/FAILED/SUCCESS, retry manual, detail payload JSON | `fins_upstash_events` |
| Tutup Buku | Status setiap periode: open/closing/closed, trigger closing, summary angka | `accounting_periods` |
| Dana Terikat Aktif | Semua pembatasan dana yang masih aktif, jatuh tempo, belum dilepas | `fins_fund_restrictions` |

---

## Ringkasan Komposisi Final

| # | Menu Utama | Tab | Kategori | Hak Akses |
|---|---|---|---|---|
| 1 | Transaksi Keuangan | 4 | Operasional | Staff |
| 2 | Penyaluran Dana | 4 | Operasional | Manager |
| 3 | Pengeluaran Operasional | 4 | Operasional | Staff |
| 4 | Anggaran & Realisasi | 3 | Operasional | Manager |
| 5 | Aset Tetap | 2 | Operasional | Staff |
| 6 | Hutang & Piutang | 3 | Operasional | Staff |
| 7 | Program Qurban | 3 | Operasional | Staff |
| 8 | Program Zakat | 2 | Operasional | Staff |
| 9 | Grant & Hibah | 4 | Operasional | Manager |
| 10 | SDM & Penggajian | 3 | Operasional | Manager |
| 11 | Master Data Keuangan | 4 | Konfigurasi | Config |
| 12 | Konfigurasi Program | 3 | Konfigurasi | Config |
| 13 | Pengaturan Laporan | 2 | Konfigurasi | Config |
| 14 | Periode Akuntansi | 2 | Konfigurasi | Config |
| 15 | Laporan Keuangan PSAK 45 | 5 | Laporan | Readonly |
| 16 | Laporan Donasi & Program | 5 | Laporan | Readonly |
| 17 | Laporan Operasional | 5 | Laporan | Readonly |
| 18 | Laporan Grant | 3 | Laporan | Readonly |
| 19 | Laporan SDM | 3 | Laporan | Readonly |
| 20 | Rekonsiliasi Bank | 3 | Monitoring | Staff |
| 21 | Monitoring Sistem | 3 | Monitoring | Config |
| **Total** | **21 Menu** | **72 Tab** | | |
