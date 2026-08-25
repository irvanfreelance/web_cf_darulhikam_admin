# FINS × Crowdfunding — Database Migration Guide

Konversi schema FINS dari MySQL (`zains_csf`) ke PostgreSQL (Neon),
diintegrasikan dengan schema crowdfunding yang sudah ada.

---

## Urutan Eksekusi File

```
crowdfunding schema + seed  ← sudah ada (prasyarat)
        ↓
01_fins_schema_postgres.sql
        ↓
02_fins_crowdfunding_integration.sql
        ↓
04_fins_seed_aligned.sql
        ↓
05_fins_deferred_fk.sql
        ↓
03_fins_triggers.md  ← dokumentasi saja (bukan SQL)
```

**PENTING:** Jalankan setiap file secara berurutan dalam satu koneksi database Neon.
Jangan loncat urutan karena ada dependensi antar file.

---

## Penjelasan per File

### `01_fins_schema_postgres.sql`
Membuat 11 tabel FINS PostgreSQL dari konversi MySQL:

| Tabel | Keterangan | PK Type |
|---|---|---|
| `fins_bank` | Master data bank | varchar(5) natural |
| `fins_bank_rek` | Rekening & settlement channel | varchar(50) natural |
| `fins_coa` | Chart of Accounts (hierarki) | varchar(14) natural |
| `fins_saldo_dana` | Mapping dana → COA | varchar(15) natural (FK fins_coa) |
| `fins_aset` | Aset tetap organisasi | bigserial |
| `fins_budget` | Anggaran per COA per periode | bigserial |
| `fins_trans` | Transaksi keuangan utama | bigserial + id_trans UNIQUE |
| `fins_jurnal` | Jurnal double-entry | bigserial + id_jurnal UNIQUE |
| `fins_opname` | Rekonsiliasi saldo kas/bank | composite natural PK |
| `fins_report` | Struktur baris laporan keuangan | bigserial |
| `fins_upstash_events` | Event store Upstash Workflow/Cron | bigserial |

**Konversi rules yang diterapkan:**
- ✅ `AUTO_INCREMENT` → `bigserial`
- ✅ Natural PK (kode bank, kode COA) tetap sebagai varchar PK
- ✅ `ENUM` → `varchar + CHECK constraint`
- ✅ Tidak ada UUID
- ✅ Indeks dioptimasi untuk high-traffic (partial index, composite index)
- ✅ Semua trigger log (`*_before_update` ke log table) **dihapus**
- ✅ Cross-schema FK (ke `campaigns`, `invoices`) **dideferred** ke file 05

---

### `02_fins_crowdfunding_integration.sql`
Menambahkan kolom penghubung dan tabel junction:

| Object | Keterangan |
|---|---|
| `invoices.fins_trans_id` | Kolom baru: link invoice → fins_trans |
| `payment_methods.fins_coa_debet` | COA bank/digital yang didebet saat settlement |
| `payment_methods.fins_mutasi` | Kode mutasi FINS (`2`, `4`, `e`, `3`, `6`) |
| `payment_methods.fins_bank_rek_id` | Rekening settlement yang menerima dana |
| `fins_campaign_coa` | Tabel baru: mapping campaign → COA (receipt, fund, expense) |
| `fins_invoice_admin_fee` | Tabel baru: split base_amount vs admin_fee per invoice |
| `fins_campaign_budget_summary` | Tabel baru: snapshot penerimaan aktual per campaign |

**Catatan:** Kolom baru ditambahkan sebagai plain type (tanpa FK constraint).
FK ditambahkan di file 05 setelah seed data ada.

---

### `04_fins_seed_aligned.sql`
Seed data FINS yang selaras dengan data crowdfunding. Urutan internal:

```
Section  1: fins_bank          (14 bank/gateway)
Section  2: fins_bank_rek      (12 rekening & channel settlement)
Section  3: fins_coa           (67 akun COA level 1-4)
Section  4: fins_saldo_dana    (5 mapping dana → COA)
Section  5: fins_aset          (5 aset tetap sample)
Section  6: fins_report        (baris LPK, LPO, LPD, LAK)
Section  7: UPDATE payment_methods (fins_coa_debet, fins_mutasi, fins_bank_rek_id)
Section  8: fins_campaign_coa  (12 campaign → COA mapping)
Section  9: fins_budget        (11 anggaran per campaign)
Section 10: fins_trans         (19 transaksi penerimaan dari invoice PAID)
Section 11: fins_trans fee     (5 reklasifikasi biaya admin)
Section 12: fins_jurnal        (double-entry via INSERT...SELECT)
Section 13: fins_invoice_admin_fee (5 baris split admin fee)
Section 14: fins_opname        (daily + monthly, computed dari jurnal)
Section 15: fins_campaign_budget_summary (snapshot aktual)
Section 16: fins_upstash_events (log PAID events & fee reklasifikasi)
Section 17: UPDATE invoices.fins_trans_id
```

---

### `05_fins_deferred_fk.sql`
Menambahkan semua FK constraint lintas-skema setelah seed:

| Constraint | From → To |
|---|---|
| `fk_fins_budget_campaign` | `fins_budget.campaign_id` → `campaigns(id)` |
| `fk_fins_trans_invoice` | `fins_trans.(invoice_id, created_at)` → `invoices` |
| `fk_invoices_fins_trans` | `invoices.fins_trans_id` → `fins_trans(id)` |
| `fk_payment_methods_fins_coa` | `payment_methods.fins_coa_debet` → `fins_coa(coa)` |
| `fk_payment_methods_fins_bank_rek` | `payment_methods.fins_bank_rek_id` → `fins_bank_rek` |
| `fk_fins_bank_rek_coa` | `fins_bank_rek.coa` → `fins_coa(coa)` |
| `fk_campaign_coa_receipt/fund/expense` | `fins_campaign_coa.*` → `fins_coa(coa)` |
| `fk_inv_fee_coa_*` | `fins_invoice_admin_fee.*` → `fins_coa(coa)` |

File ini juga membuat **partial index** `idx_fins_jurnal_thisyear` sebagai
pengganti tabel `fins_jurnal_thisyear` dari MySQL, dan menjalankan
**verifikasi integritas** (DO block dengan RAISE NOTICE).

---

### `03_fins_triggers.md`
Dokumentasi konversi trigger MySQL ke Upstash Workflow + QStash Cron.
**Bukan SQL** — tidak perlu dieksekusi ke database.

---

## Relasi Crowdfunding × FINS

```
campaigns ──────────────────── fins_campaign_coa ──── fins_coa
    │                                                      │
    ├── fins_budget (campaign_id)                          │
    └── fins_campaign_budget_summary (campaign_id)         │
                                                           │
payment_methods ─── fins_coa_debet ──────────────── fins_coa
       └─────────── fins_bank_rek_id ───────── fins_bank_rek
                                                      (coa → fins_coa)

invoices ─── fins_trans_id ──────────────────── fins_trans
    ↑                                                  │
    │         crowdfunding_invoice_id ──────────────────┘
    └─────────────────────────────────────── (composite FK)

fins_trans ─── fins_trans_id ─────────── fins_jurnal (ON DELETE CASCADE)
    └──────── id_trans + 'F' ──────── fins_trans (fee reklasifikasi)
                                          └── fins_invoice_admin_fee
```

---

## Alur Akuntansi per Pembayaran Donasi

```
Donatur bayar → Xendit/Midtrans webhook
      ↓
POST /api/webhooks/xendit
      ↓ (Upstash Workflow: INVOICE_PAID)
1. UPDATE invoices SET status = 'PAID', paid_at = NOW()
      ↓
2. INSERT fins_trans (jenis='r', approve='a', nominal=base_amount)
      ↓
3. INSERT fins_jurnal debet: COA Bank/Digital  debet=base_amount
   INSERT fins_jurnal kredit: COA Donasi (401.xx) kredit=base_amount
      ↓
4. if admin_fee > 0:
   INSERT fins_trans fee (reklasifikasi: COA Donasi → COA Fee 402.01)
   INSERT fins_jurnal debet: COA Donasi  debet=admin_fee
   INSERT fins_jurnal kredit: 402.01.000.000  kredit=admin_fee
      ↓
5. UPDATE invoices SET fins_trans_id = [fins_trans.id]
6. UPDATE fins_campaign_budget_summary SET collected_amount += base_amount
7. INSERT fins_upstash_events (status='SUCCESS')
```

**Hasil di laporan keuangan (LPO):**
- Baris "Donasi Kesehatan" = SUM(kredit) on 401.01.001.000 - SUM(debet) on 401.01.001.000
  (debet kecil = reklasifikasi admin fee mengurangi gross donasi)
- Baris "Biaya Admin Platform" = SUM(kredit) on 402.01.000.000

---

## Konversi Trigger MySQL → PostgreSQL/Upstash

| MySQL Trigger | PostgreSQL/Upstash |
|---|---|
| `fins_*_before_update` (update `dtu`) | Kolom `dtu DEFAULT NOW()` di schema |
| `fins_trans_before_insert` | App layer: generate `id_trans`, validate `nominal > 0` |
| `fins_trans_after_insert` | Upstash Workflow: auto-create `fins_jurnal` double-entry |
| `fins_trans_after_update` | Upstash Workflow: update/hapus jurnal saat approve berubah |
| `fins_trans_after_delete` | FK CASCADE: `fins_jurnal.fins_trans_id ON DELETE CASCADE` |
| `fins_jurnal_before_insert` | App layer: `id_jurnal = id_trans + '1'` atau `'2'` |
| `fins_jurnal_after_insert/delete` (thisyear) | Partial index `idx_fins_jurnal_thisyear` |
| `fins_trans_before_delete` (log) | **DIHAPUS** — log trigger tidak dibuat ulang |
| `fins_trans_before_update` (log) | **DIHAPUS** — log trigger tidak dibuat ulang |
| `fins_jurnal_before_update` (log) | **DIHAPUS** — log trigger tidak dibuat ulang |

---

## Upstash Environment Variables

Tambahkan ke `.env.local`:

```bash
# Upstash QStash (untuk Workflow dan Cron)
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...

# Upstash Workflow base URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Cron secret untuk validasi endpoint
CRON_SECRET=your-random-secret-string

# Neon PostgreSQL
DATABASE_URL=postgresql://...@....neon.tech/neondb?sslmode=require
```

---

## Jadwal Upstash QStash Cron

| Job | Jadwal (UTC) | WIB | Endpoint |
|---|---|---|---|
| `opname-daily` | `0 16 * * *` | 23:00 | `/api/fins/cron/opname-daily` |
| `opname-monthly` | `5 17 1 * *` | 00:05 tgl 1 | `/api/fins/cron/opname-monthly` |
| `opname-yearly` | `10 17 1 1 *` | 00:10, 1 Jan | `/api/fins/cron/opname-yearly` |
| `jurnal-cleanup` | `15 18 1 1 *` | 01:15, 1 Jan | `/api/fins/cron/jurnal-cleanup` |
| `event-retry` | `*/5 * * * *` | setiap 5 mnt | `/api/fins/cron/event-retry` |
| `campaign-budget-sync` | `0 18 * * *` | 01:00 | `/api/fins/cron/campaign-budget-sync` |

Daftarkan semua cron jobs dengan menjalankan:
```bash
npx ts-node scripts/register-cron-jobs.ts
```

---

## Konvensi Kode FINS

### id_trans (fins_trans)
```
Format : YYMMDDHHmmss + 6 digit random
Panjang: 18 karakter
Contoh : 260501070935123456
         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
         26 05 01 07 09 35 123456
         yr mo dy HH mm ss rand
```

Fee reklasifikasi: id_trans + 'F' (19 karakter)
```
Contoh : 260501070935123456F
```

### id_jurnal (fins_jurnal)
```
Format : id_trans + '1' (debet entry)
         id_trans + '2' (kredit entry)
Panjang: 19-20 karakter
```

### Kode mutasi (fins_trans.mutasi)
| Kode | Makna | Channel |
|---|---|---|
| `2` | Bank VA masuk | BCA VA, Mandiri VA, BSI VA, dll |
| `3` | Transfer manual | BCA Manual, Mandiri Manual |
| `4` | QRIS | Xendit QRIS Dynamic |
| `6` | Retail outlet | Alfamart, Indomaret |
| `e` | E-wallet | ShopeePay, DANA, LinkAja, GoPay |
| `''` | Reklasifikasi internal | Fee admin (tidak ada settlement fisik) |

### COA Numbering
```
1xx.xx.xxx.xxx  — Aktiva
2xx.xx.xxx.xxx  — Kewajiban
3xx.xx.xxx.xxx  — Dana / Ekuitas
4xx.xx.xxx.xxx  — Penerimaan
5xx.xx.xxx.xxx  — Pengeluaran

Level 1: xxx.00.000.000  (kelompok besar, parent=y)
Level 2: xxx.xx.000.000  (sub-kelompok, parent=y)
Level 3: xxx.xx.xxx.000  (jenis, parent=y atau n)
Level 4: xxx.xx.xxx.xxx  (akun detail, parent=n, dipakai di jurnal)
```

---

## Laporan Keuangan yang Tersedia

| Kode | Nama | COA Range |
|---|---|---|
| `LPK` | Laporan Posisi Keuangan (Balance Sheet) | 100-300 |
| `LPO` | Laporan Penerimaan & Pengeluaran | 400-500 |
| `LPD` | Laporan Penerimaan Donasi per Campaign | 401.xx |
| `LAK` | Laporan Arus Kas | 101, 400-500 |

Query template laporan LPO per bulan:
```sql
SELECT
  fr.nama_coa,
  fr.kode,
  COALESCE(SUM(fj.kredit) - SUM(fj.debet), 0) AS saldo
FROM fins_report fr
LEFT JOIN fins_jurnal fj
  ON fj.coa = fr.coa
  AND fj.tgl_exre BETWEEN :date_from AND :date_to
WHERE fr.report = 'LPO'
  AND fr.active = 'y'
GROUP BY fr.id, fr.nama_coa, fr.kode, fr.sort
ORDER BY fr.sort;
```

---

## Checklist Setelah Migrasi

- [ ] Jalankan 01 → 02 → 04 → 05 berurutan
- [ ] Verifikasi output DO block di file 05 (tidak ada WARNING)
- [ ] `fins_jurnal imbalance = 0` (double-entry seimbang)
- [ ] `invoices linked → fins > 0`
- [ ] `payment_methods fins_coa > 0`
- [ ] Daftarkan Upstash Cron jobs
- [ ] Set env vars di Vercel
- [ ] Test webhook Xendit/Midtrans di staging
- [ ] Verifikasi laporan LPO di admin panel
