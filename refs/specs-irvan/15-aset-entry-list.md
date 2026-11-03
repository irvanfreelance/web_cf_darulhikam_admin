# 15 — Entry Aset + List Aset + Penyusutan
> Backlog: **K15** · PIC: **Pak Irvan** · Tanggal: **Rab 18 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-aset` · PR: **feat(fins): Entry & List Aset + jadwal penyusutan**

## 1. Tujuan
Daftar aset tetap, input aset baru, jadwal penyusutan otomatis, posting penyusutan bulanan ke jurnal (penyesuaian `depresiasi`).

## 2. Dependensi
- Task sebelumnya: 03, 10, 12.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Entry Aset` → `/fins/aset/baru`, `List Aset` → `/fins/aset`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/EntryAset.jsx`, `src/pages/ListAset.jsx`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_aset` (5 baris): `id, kode_aset UNIQUE, aset, coa, deskripsi, tgl_akuisisi timestamptz, biaya_akuisisi bigint, id_kantor, metode (Garis Lurus|Saldo Menurun|Jumlah Angka Tahun), masa_manfaat int (bulan), tgl_akhir_manfaat, persentase_susut, coa_debit (beban susut), coa_kredit (akumulasi), susut_terakhir, tgl_susut_lanjutan, deleted n|y, user_update, note`.
- `asset_depreciation_schedules`: `fins_aset_id, periode_bulan, periode_tahun, urutan_periode, nilai_buku_awal, nilai_susut, nilai_buku_akhir, akumulasi_susut, metode, status scheduled|posted|skipped|reversed, fins_trans_id, period_id, posted_at, posted_by, catatan`.
- `period_adjusting_entries` `jenis_aje='depresiasi'`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/aset/page.tsx`, `app/(admin)/fins/aset/baru/page.tsx`, `app/(admin)/fins/aset/[id]/page.tsx`
- `app/api/fins/aset/route.ts`, `[id]/route.ts`, `[id]/schedule/route.ts`, `app/api/fins/aset/post-susut/route.ts`
- `lib/fins/depreciation.ts`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. `depreciation.ts`: hitung jadwal untuk 3 metode (bulanan, `masa_manfaat` bulan).
3. POST aset → INSERT `fins_aset` + INSERT jadwal `status='scheduled'` (withTransaction). Kode `AST-YYYY-###`.
4. Edit aset hanya bila belum ada jadwal `posted`; 'hapus' = `deleted='y'`.
5. Post susut periode X: semua jadwal `scheduled` bulan X → `postTransaksi` (debet `coa_debit`, kredit `coa_kredit`) + `period_adjusting_entries(depresiasi)` → `status='posted'`, isi `fins_trans_id, posted_at, posted_by`; update `fins_aset.susut_terakhir, tgl_susut_lanjutan`.
6. Aset lama (5 baris) belum punya jadwal → tombol 'Buat jadwal'.
7. PR.

## 7. Aturan bisnis & validasi
- Garis lurus: biaya/masa. Saldo menurun: nilai buku × persentase/12. JAT: sesuai bobot tahun.
- Tidak posting ke periode closed; tidak dobel (status cek).
- Pembalikan posting = `reversed` + jurnal balik.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Jadwal terbentuk & total susut = biaya (garis lurus, residu 0).
- [ ] Post bulan → jurnal + PAE + status posted.
- [ ] Post ulang → 0 baris.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Aset laptop 12jt 48 bln GL → 250rb/bulan.
2. Post November → Trial Balance beban susut 250rb.
3. Ulangi → ditolak.

## 10. Belum pasti / perlu konfirmasi
- Nilai residu tidak ada kolomnya → diasumsikan 0.
- `persentase_susut` contoh 25 (tahunan?) untuk GL 48 bln — konsisten, tapi konfirmasi arti untuk Saldo Menurun.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
