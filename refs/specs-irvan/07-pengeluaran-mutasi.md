# 07 — Pengeluaran + Mutasi antar rekening
> Backlog: **K05** · PIC: **Pak Irvan** · Tanggal: **Sen 9 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-pengeluaran-mutasi` · PR: **feat(fins): Pengeluaran & mutasi antar rekening**

## 1. Tujuan
Input pengeluaran (`jenis='e'`) dengan approve, dan mutasi kas↔bank / bank↔bank lewat `internal_transfers` (keluar, masuk, biaya).

## 2. Dependensi
- Task sebelumnya: 03, 06 (form & pola approve).
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Pengeluaran` → `/fins/pengeluaran`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/Pengeluaran.jsx`, `src/pages/PengeluaranOps.jsx`
- store: `src/utils/pengeluaranStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_trans` `jenis='e'`, `approve u→a/r`; `fins_level_approve.expend_min/max`.
- `expense_requests(nomor_expense, judul, jenis reimbursement|pembayaran_langsung|kasbon_settlement|operasional_rutin, total_amount bigint, campaign_id, coa_debet, coa_kredit, status, nik_pengaju, nik_approver, tgl_pengajuan, tgl_bayar, metode_bayar, fins_trans_id, period_id)` + `expense_items(expense_request_id, keterangan, qty, satuan, harga_satuan, subtotal, coa, receipt_url)` — 0 baris.
- `internal_transfers(nomor_transfer, dari_rekening_id, ke_rekening_id, jumlah bigint, biaya_transfer bigint, tgl_kirim, tgl_diterima, bukti_transfer_url, status pending|in_transit|completed|failed|cancelled, fins_trans_id_keluar, fins_trans_id_masuk, fins_trans_id_biaya, period_id, nik_input)`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/pengeluaran/page.tsx` (tab Pengeluaran | Mutasi)
- `app/api/fins/pengeluaran/route.ts`, `[id]/approve/route.ts`
- `app/api/fins/mutasi/route.ts`, `[id]/route.ts`

## 6. Langkah implementasi (berurutan)
1. Branch dari `main`.
2. Pengeluaran: simpan ke `expense_requests` + `expense_items` (header+rincian, `withTransaction`), `status` draft→approved→paid; saat **bayar** panggil `insertTrans`+`postJurnalForTrans` (`jenis='e'`), isi `expense_requests.fins_trans_id`.
3. Mutasi: POST `internal_transfers status='pending'`; konfirmasi `completed` → 2 posting (keluar: debet rekening tujuan / kredit rekening asal) dan bila `biaya_transfer>0` posting biaya (debet beban bank / kredit asal); simpan id ke `fins_trans_id_keluar/_masuk/_biaya`.
4. Batal → `status='cancelled'` (sebelum completed) atau jurnal balik (sesudah).
5. Reuse `components/fins/trans-form.tsx`. PR.

## 7. Aturan bisnis & validasi
- Rekening asal ≠ tujuan.
- Saldo asal (hitungan task 04) < jumlah+biaya → peringatan (bukan blokir).
- `nomor_expense` / `nomor_transfer` unik: `EXP-YYMM-####`, `TRF-YYMM-####`.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Pengeluaran dibayar → jurnal `e` seimbang, `fins_trans_id` terisi.
- [ ] Mutasi completed → saldo asal turun, tujuan naik, biaya terjurnal.
- [ ] Batal tidak menghapus baris.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Pengeluaran ATK 2 item → approve → bayar → cek jurnal.
2. Mutasi Kas→Bank Rp1jt biaya 6.500 → 3 transaksi terkait.

## 10. Belum pasti / perlu konfirmasi
- Mutasi masuk & keluar: satu posting (debet tujuan/kredit asal) cukup; kolom `fins_trans_id_masuk` diisi sama dengan keluar atau dibiarkan null — perlu keputusan.
- `expense_requests.cash_advance_id` (kasbon) tidak dipakai dulu.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
