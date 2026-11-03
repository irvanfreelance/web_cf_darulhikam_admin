# 06 — Penerimaan (input transaksi masuk)
> Backlog: **K04** · PIC: **Pak Irvan** · Tanggal: **Jum 6 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-penerimaan` · PR: **feat(fins): Penerimaan + approve**

## 1. Tujuan
Input penerimaan non-crowdfunding (kas/bank), approve berjenjang, posting jurnal `jenis='r'`.

## 2. Dependensi
- Task sebelumnya: 01 (program), 03.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Penerimaan` → `/fins/penerimaan`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/Penerimaan.jsx`
- store: `src/utils/penerimaanStore.js`, `src/utils/transaksiRutinStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_trans` `jenis='r'`, `approve` `u`→`a`/`r`, `mutasi` (kode via), `id_program`, `id_contact` (donor/kontak), `kinerja`.
- `fins_level_approve.receipt_min/receipt_max` (batas approve penerimaan).
- `fins_campaign_coa(campaign_id, coa_receipt, coa_fund)` untuk default COA bila dari campaign.
- `fins_program` (task 01).

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/penerimaan/page.tsx`
- `app/api/fins/penerimaan/route.ts` (GET, POST)
- `app/api/fins/penerimaan/[id]/approve/route.ts`
- `components/fins/trans-form.tsx` (dipakai ulang task 07)

## 6. Langkah implementasi (berurutan)
1. Branch dari `main`.
2. POST simpan draf `approve='u'` **tanpa** jurnal: INSERT `fins_trans` lewat fungsi `insertTransDraft` di `lib/fins/posting.ts` (tambahkan di file milik Irvan).
3. Approve: `withTransaction` → `UPDATE fins_trans SET approve='a', nik_approve … WHERE id=$1 AND approve='u'` → buat 2 jurnal dari baris itu (`postJurnalForTrans(client,id)` — pecah helper task 03 menjadi `insertTrans` + `postJurnalForTrans`).
4. Reject → `approve='r'`, tanpa jurnal.
5. Form: tanggal, kantor, via (mutasi), COA debet (kas/bank), COA kredit (pendapatan), program, kontak, nominal, qty, kinerja, keterangan.
6. List + filter + total. PR.

## 7. Aturan bisnis & validasi
- COA debet harus kas/bank aktif; kredit harus akun pendapatan/dana (prefix sesuai bagan; validasi `parent='n'`).
- Nominal di luar rentang `receipt_min/max` jabatan → tidak bisa approve oleh jabatan itu (peringatan bila role belum terpetakan).
- Transaksi dari crowdfunding (`crowdfunding_transaction_id` ≠ null) bukan di sini (C05 Bot).

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Draf tidak membuat jurnal.
- [ ] Approve membuat 2 jurnal `jenis='r'`.
- [ ] Reject tidak membuat jurnal.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Input penerimaan tunai Rp250.000 program ZKT → draf.
2. Approve → Rekap Jurnal menampilkan debet kas / kredit pendapatan.
3. Dashboard Cash Bank kas naik.

## 10. Belum pasti / perlu konfirmasi
- Kode `mutasi` untuk input manual: pakai daftar 1/2/3/4/6/10/e dari dokumen 03.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
