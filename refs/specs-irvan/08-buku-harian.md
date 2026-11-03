# 08 — Buku Harian (kas/bank harian)
> Backlog: **K06** · PIC: **Pak Irvan** · Tanggal: **Sel 10 Nov 2026 (sesi 1)** · Estimasi: 1 sesi
> Branch: `feat/fins-buku-harian` · PR: **feat(fins): Buku Harian kas/bank**

## 1. Tujuan
Laporan harian per rekening kas/bank: saldo awal, setiap mutasi, saldo berjalan, saldo akhir; ekspor.

## 2. Dependensi
- Task sebelumnya: 03, 06, 07.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Buku Harian` → `/fins/buku-harian`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/BukuHarian.jsx`
- store: `src/utils/finsBukuHarianStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_jurnal(coa, tgl_exre, debet, kredit, keterangan, id_exre, noresi, id_kantor)`.
- `fins_opname` saldo awal (`per='d'`, tanggal < tanggal pilihan, terakhir).
- `fins_bank_rek`, `fins_kantor_coa` untuk pilihan rekening.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/buku-harian/page.tsx`
- `app/api/fins/buku-harian/route.ts`
- `lib/fins/saldo.ts` (BARU, dipakai ulang task 11/12): `saldoAwal(client, coa, tgl, kantor)`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. `lib/fins/saldo.ts`: saldo awal = opname terakhir sebelum tgl + Σ jurnal antara opname itu dan tgl.
3. API: pilih COA + rentang tanggal; baris jurnal urut `tgl_exre, id`; saldo berjalan dengan window `SUM() OVER`.
4. UI tabel + ekspor CSV/print.
5. PR.

## 7. Aturan bisnis & validasi
- Arah saldo pakai `fins_coa.saldo` (d/k).
- Rentang maks 92 hari per permintaan.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Saldo akhir = saldo awal + Σdebet − Σkredit.
- [ ] Sama dengan angka Dashboard Cash Bank untuk tanggal yang sama.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Pilih Kas Pusat hari ini → transaksi QA task 06/07 muncul berurutan.
2. Bandingkan saldo akhir dengan dashboard.

## 10. Belum pasti / perlu konfirmasi
- Fitur 'Penutupan' harian (opname fisik) ada di task 10, bukan di sini.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
