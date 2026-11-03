# 16 — Laporan Keuangan (PSAK 45/ISAK 35) + Laporan Bulanan — TASK TERAKHIR
> Backlog: **K14** · PIC: **Pak Irvan** · Tanggal: **Kam 19 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-laporan-keuangan` · PR: **feat(fins): Laporan Keuangan & Laporan Bulanan**

## 1. Tujuan
Laporan Posisi Keuangan (LPK), Penghasilan Komprehensif/Operasional (LPO), Arus Kas (LAK), Perubahan Dana/LPD, CALK, dan Laporan Bulanan per periode — dengan kop lembaga, ekspor PDF/CSV. Butuh semua task sebelumnya.

## 2. Dependensi
- Task sebelumnya: 01 (kop), 09, 10, 12, 13, 14, 15 — **semua**.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Laporan Keuangan` → `/fins/laporan-keuangan`, `Laporan Bulanan` → `/fins/laporan-bulanan`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/LaporanKeuangan.jsx`, `src/pages/LaporanBulanan.jsx`
- store: `src/utils/laporanBulananStore.js`, `src/utils/laporanDanaStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_report` + rumus (task 13), `getTrialBalance` (task 12).
- `fins_calk_notes(period_id, nomor_catatan, judul, isi, tipe_konten, aktif)`.
- `fins_net_asset_changes(period_id, saldo_awal_tk/ts/tp, penerimaan_*, pengeluaran_tk, pelepasan_batasan_*, saldo_akhir_*, total_aset_bersih, synced_at)`.
- `fins_fund_restrictions`, view `v_psak45_summary(coa, nama_coa, jenis_dana, saldo_berjalan)` (baca saja).
- `accounting_periods` (pilih periode), `ngo_configs` (kop, NPWP).

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/laporan-keuangan/page.tsx`, `app/(admin)/fins/laporan-bulanan/page.tsx`
- `app/api/fins/laporan/[report]/route.ts` (`LPK|LPO|LAK|LPD`)
- `app/api/fins/laporan-bulanan/route.ts`, `app/api/fins/calk/route.ts`
- `components/fins/report-table.tsx`, `components/fins/kop-lembaga.tsx`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. Evaluasi rumus tiap baris `fins_report` terhadap TB periode → angka berjalan & pembanding (periode sebelumnya).
3. LPK harus seimbang (Aset = Liabilitas + Aset Neto). Tampilkan selisih bila tidak.
4. LPD: dari `fins_net_asset_changes` bila ada baris periode; jika tidak, hitung dari rumus (jangan menulis tabel itu di PR ini).
5. CALK: CRUD `fins_calk_notes` per periode (nonaktif via `aktif=false`).
6. Laporan Bulanan: ringkasan penerimaan/pengeluaran per bulan + per program + per kantor.
7. Ekspor: print-CSS → PDF browser + CSV.
8. PR.

## 7. Aturan bisnis & validasi
- Hanya periode `closing`/`closed` diberi label final; `open` = 'DRAF'.
- Baris `active='n'` disembunyikan; baris judul (`coa=''`) tanpa angka.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] 4 laporan tampil sesuai urutan `fins_report.sort`.
- [ ] LPK seimbang untuk data QA.
- [ ] Kop berisi nama, alamat, NPWP dari Profile Lembaga.
- [ ] Ekspor PDF/CSV jalan.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Pilih periode QA → LPK seimbang, LPO surplus = penerimaan − beban (termasuk susut task 15).
2. Bandingkan 1 baris dengan TB manual.
3. Print → kop benar.

## 10. Belum pasti / perlu konfirmasi
- Kolom `fins_fund_restrictions` belum dicek detail → `SELECT * … LIMIT 1` di awal.
- Siapa yang mengisi `fins_net_asset_changes` (cron sync?) belum ada — tulis sebagai saran ke Bot bila dibutuhkan.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
