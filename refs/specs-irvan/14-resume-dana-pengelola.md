# 14 — Resume Dana Pengelola (DP/Amil)
> Backlog: **K08** · PIC: **Pak Irvan** · Tanggal: **Sel 17 Nov 2026** · Estimasi: 1 sesi
> Branch: `feat/fins-resume-dp` · PR: **feat(fins): Resume Dana Pengelola**

## 1. Tujuan
Ringkasan hak amil/dana pengelola per program per periode = penerimaan × `dp_percent`, dibanding realisasi pemakaian DP.

## 2. Dependensi
- Task sebelumnya: 01 (fins_program.dp_percent), 06, 12.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): **BOT-S01**: `fins_program.dp_percent` (tidak ada tabel `fins_dp_rate`).
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Resume Dana Pengelola` → `/fins/resume-dana-pengelola`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/ResumeDanaPengelola.jsx`
- store: `src/utils/resumeDanaPengelolaStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_trans`/`fins_jurnal` `jenis='r'` per `id_program`.
- `fins_program(id, kode, nama, dp_percent)`.
- `fins_saldo_dana(coa_dana, coa_expend, coa_receipt, ops, active)` untuk COA dana pengelola.
- `fins_invoice_admin_fee` (biaya admin donasi online; baca saja bila relevan).

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/resume-dana-pengelola/page.tsx`
- `app/api/fins/resume-dana-pengelola/route.ts`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. Per program: Σpenerimaan periode, hak DP = Σ × dp_percent/100, realisasi DP = Σ jurnal kredit/debet pada COA dana pengelola (`fins_saldo_dana` dengan `ops='y'` — 2 baris di DB).
3. Tabel + total + grafik batang.
4. Opsional tombol 'Posting alokasi DP' → `postTransaksi` (debet dana program / kredit dana pengelola) per periode, sekali saja (cek `note` periode).
5. PR.

## 7. Aturan bisnis & validasi
- `id_program=0` = tanpa program → baris 'Lain-lain', DP 0.
- Posting alokasi hanya bila periode `open`, satu kali per program-periode.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Angka per program = Σ penerimaan × %.
- [ ] Posting alokasi tidak dobel.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Penerimaan ZKT Rp1jt (12,5%) → hak DP 125rb.
2. Klik posting 2× → kedua ditolak.

## 10. Belum pasti / perlu konfirmasi
- Arti `fins_saldo_dana.ops` (y/n?) dan COA dana pengelola perlu konfirmasi.
- Basis DP: bruto penerimaan atau neto setelah `fins_invoice_admin_fee`?

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
