# 11 — Buku Besar
> Backlog: **K11** · PIC: **Pak Irvan** · Tanggal: **Kam 12 Nov 2026** · Estimasi: 1 sesi
> Branch: `feat/fins-buku-besar` · PR: **feat(fins): Buku Besar per COA**

## 1. Tujuan
Mutasi per COA (semua akun, bukan hanya kas/bank) dengan saldo awal–berjalan–akhir, drill ke transaksi.

## 2. Dependensi
- Task sebelumnya: 03, 09.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Buku Besar` → `/fins/buku-besar`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/BukuBesar.jsx`
- store: `src/utils/finsLedgerStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_jurnal` (+ JOIN `fins_trans` lewat `fins_trans_id` untuk detail).
- `fins_coa(coa, nama_coa, coa_parent, level, saldo)`.
- Saldo awal via `lib/fins/saldo.ts`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/buku-besar/page.tsx`
- `app/api/fins/buku-besar/route.ts`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. Pilih COA (bisa induk → gabung semua turunan `coa LIKE prefix%` sesuai `coa_parent`), kantor, rentang.
3. Query jurnal + saldo berjalan window function; paginasi.
4. Klik baris → modal detail `fins_trans`.
5. Ekspor CSV. PR.

## 7. Aturan bisnis & validasi
- Saldo normal dari `fins_coa.saldo`.
- Induk = agregat turunan.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Saldo akhir COA = Trial Balance (task 12) nanti.
- [ ] Drill detail jalan.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. COA beban ATK → transaksi QA task 07 muncul.
2. COA induk 101 → gabungan kas+bank.

## 10. Belum pasti / perlu konfirmasi
- Hierarki: `coa_parent` (varchar 50) vs `parent` (y/n) — pakai `coa_parent` untuk relasi.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
