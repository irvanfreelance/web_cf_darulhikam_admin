# 13 — Rumus Report (pemetaan COA ke laporan)
> Backlog: **K13** · PIC: **Pak Irvan** · Tanggal: **Sen 16 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-rumus-report` · PR: **feat(fins): Rumus Report**

## 1. Tujuan
Kelola baris laporan (`fins_report`) dan rumus COA tiap baris untuk 4 laporan yang sudah ada datanya: LPK, LPO, LAK, LPD.

## 2. Dependensi
- Task sebelumnya: 12 (untuk pratinjau angka).
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada (kolom formula **tidak** ditambah; lihat Belum pasti).
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Rumus Report` → `/fins/rumus-report`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/RumusReport.jsx`
- store: `src/utils/laporanDanaStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_report` (83 baris): `id, nama_coa varchar(100), level, coa text, report varchar(20) (LPK 33, LPO 26, LAK 11, LPD 13), active y/n, sort, keterangan, kode varchar(5), dtu`. Baris judul berisi HTML `<b>…</b>` dan `coa=''`. **Isi nyata `coa` = satu kode COA** (mis. `401.00.000.000`, `101.00.000.000`); COA induk berakhiran `.000` = agregat semua turunan. `kode` = id baris (mis. `AO1`, `SA`, `SAK`, `T1`, `TA`, `C01`).
- `fins_coa` untuk validasi COA dalam rumus.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/rumus-report/page.tsx`
- `app/api/fins/rumus-report/route.ts`, `[id]/route.ts`
- `lib/fins/report-formula.ts` (parser + evaluator, dipakai task 16)

## 6. Langkah implementasi (berurutan)
1. Branch.
2. Evaluator: `coa` → buang segmen akhir `.000` berurutan → prefix → Σ saldo TB semua COA daun `LIKE prefix%`. Kode khusus LAK: `SA` = saldo awal periode, `SAK` = saldo akhir (bukan mutasi).
3. Validasi: `coa` ada di `fins_coa`; `kode` unik per `report`.
4. CRUD baris: ubah `nama_coa, coa, sort, level, active, keterangan`; tambah baris baru; nonaktif via `active='n'`.
5. Pratinjau angka baris memakai `getTrialBalance` (task 12).
6. PR.

## 7. Aturan bisnis & validasi
- COA dalam rumus harus ada di `fins_coa`.
- `coa` kosong hanya untuk baris judul.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Semua 83 baris tampil per tab laporan, urut `sort`.
- [ ] Rumus tidak valid → pesan jelas.
- [ ] Pratinjau angka muncul.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Tab LPK → ubah sort 2 baris → urutan berubah.
2. Isi rumus COA salah → ditolak.

## 10. Belum pasti / perlu konfirmasi
- Format sudah dicek (1 COA per baris). Rumus multi-COA / operasi `+`/`−` antar `kode` **tidak didukung** skema saat ini → bila perlu, minta Bot migrasi aditif `fins_report.formula text`.
- Semantik kode selain `SA`/`SAK` (mis. `T1`, `TA`) diasumsikan subtotal by-prefix.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
