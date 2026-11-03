# 01 — Profile Lembaga + Master Program FINS
> Backlog: **K16** · PIC: **Pak Irvan** · Tanggal: **Sen 2 Nov 2026 (sesi 1, mulai ≥10:00 WIB)** · Estimasi: 1 sesi
> Branch: `feat/fins-profile-program` · PR: **feat(fins): Profile Lembaga & master Program**

## 1. Tujuan
Halaman **Profile Lembaga** (identitas untuk kop laporan: nama, alamat, legalitas, NPWP, logo, email) dan **Program** (master program + persentase Dana Pengelola/DP) yang dipakai task 14 (Resume DP) dan 16 (Laporan).

## 2. Dependensi
- Task sebelumnya: tidak ada (task paling mandiri).
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): **BOT-S01** `chore/db-migrations-001` (Sen 2 Nov 08:00 WIB): `ngo_configs.npwp` + tabel `fins_program`. Migrasi dijalankan setelah Pak Irvan setujui (target 09:30 WIB).
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Profile Lembaga` → `/fins/profile-lembaga`, `Program` → `/fins/program`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/ProfileLembaga.jsx`, `src/pages/Program.jsx`, `src/pages/KonfigurasiProgram.jsx`
- store: `src/utils/finsSettingsStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `ngo_configs` (1 baris): `id, ngo_name, logo_url, address, legal_info, email, whatsapp_number, updated_at` — **baru (Bot S01): `npwp varchar(30)`**.
- **BARU (Bot S01) `fins_program`**: `id bigserial PK, kode varchar(30) UNIQUE, nama varchar(200), dp_percent numeric(6,2) default 0, campaign_id bigint NULL → campaigns.id, aktif boolean default true, created_at, updated_at`.
- Dipakai belakangan: `fins_trans.id_program integer`, `fins_jurnal.id_program integer`, `fins_budget.id_program integer` (sudah ada; 0 = tanpa program).

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/profile-lembaga/page.tsx`
- `app/(admin)/fins/program/page.tsx`
- `app/api/fins/profile-lembaga/route.ts` (GET, PATCH)
- `app/api/fins/program/route.ts` (GET list, POST) + `app/api/fins/program/[id]/route.ts` (PATCH)
- `components/fins/program-form.tsx` (opsional)

## 6. Langkah implementasi (berurutan)
1. `git checkout main && git pull && git checkout -b feat/fins-profile-program`.
2. Cek migrasi sudah jalan: `SELECT npwp FROM ngo_configs LIMIT 1` dan `SELECT 1 FROM fins_program LIMIT 1` tidak error.
3. API profile: GET `SELECT id, ngo_name, address, legal_info, npwp, logo_url, email FROM ngo_configs ORDER BY id LIMIT 1`; PATCH hanya kolom tsb (Zod), `redis.del('fins:profile')`.
4. Logo: upload pakai `@vercel/blob` (pola yang sudah ada), simpan URL ke `logo_url`.
5. API program: list (filter aktif, cari kode/nama), POST, PATCH (termasuk nonaktif via `aktif=false`, bukan hapus).
6. Halaman pakai komponen `components/shared/page-header`, `data-table` (import saja, jangan ubah).
7. Commit, push, buka PR ke `main`.

## 7. Aturan bisnis & validasi
- `kode` unik, huruf besar/angka/`-`, maks 30; `nama` wajib maks 200.
- `dp_percent` 0–100, 2 desimal (Zakat umumnya 12,5; Infaq/Sedekah ≤20 — hanya default, jangan dikunci).
- `npwp` opsional, format bebas maks 30 (boleh `00.000.000.0-000.000`).
- PATCH profile tidak boleh menyentuh kolom tracking/pixel di `ngo_configs` (milik settings).

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Profile tampil & tersimpan (termasuk NPWP & logo).
- [ ] Program bisa tambah, edit, nonaktifkan; kode duplikat → 400 pesan jelas.
- [ ] List program bisa difilter aktif/nonaktif.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Buka `/fins/profile-lembaga`, ubah alamat + NPWP → simpan → reload: nilai tetap.
2. `/fins/program`: tambah `ZKT` 12,5% → muncul; tambah `ZKT` lagi → ditolak.
3. Nonaktifkan program → hilang dari filter aktif, tetap ada di filter semua.

## 10. Belum pasti / perlu konfirmasi
- `fins_program` vs `campaigns`: relasi 1 program ↔ banyak campaign belum pasti; untuk sekarang `campaign_id` opsional.
- Nama kolom NPWP disepakati `npwp` (Bot yang buat).

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
