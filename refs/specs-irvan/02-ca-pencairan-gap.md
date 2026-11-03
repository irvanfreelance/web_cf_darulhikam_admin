# 02 — Celah Pengajuan CA & Pencairan (Zod, cache, via bayar, ekspor)
> Backlog: **K02** · PIC: **Pak Irvan** · Tanggal: **Sen 2 Nov 2026 (sesi 2)** · Estimasi: 1 sesi
> Branch: `feat/fins-ca-pencairan-gap` · PR: **fix(fins): rapikan Pengajuan CA & Pencairan (Zod, cache, via bayar)**

## 1. Tujuan
Menutup celah halaman yang **sudah ada** (`/fins/pengajuan-ca`, `/fins/pencairan`): validasi Zod, invalidasi cache, simpan `via_bayar`/`bank_rek_id` yang saat ini diterima tapi tidak disimpan, filter & ekspor CSV. **Belum** membuat jurnal (itu task 03).

## 2. Dependensi
- Task sebelumnya: tidak ada.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada (kolom sudah ada).
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → tidak ada perubahan menu

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/PengajuanCA.jsx`, `src/pages/Pencairan.jsx`
- store: `src/utils/pengajuanCaStore.js`, `src/utils/pencairanStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_ca_pengajuan` (7 baris): `id, id_buku, tanggal date, coa_debet, coa_kredit, nama_akun, keterangan, quantity, nominal numeric(20,2), realisasi, user_input, user_approve, approve varchar(15), office_id→fins_kantor, sumber_dana, department_id→fins_jabatan, no_resi, via_bayar ('' | bank | cash), bank_rek_id, tag ('' | internal | external), referensi_mitra, pencair, tanggal_cair, created_at, updated_at`.
- CHECK `approve`: `us`(diajukan) → `as`(submission disetujui) → `a`(dicairkan); tolak: `rs`/`r`; `aj`/`asj` dipakai task 05.
- Referensi: `fins_kantor(id,nama)`, `fins_bank_rek(id_rekening, id_bank, keterangan, coa, active)`, `fins_sumber_dana(id,nama,active)`, `fins_jenis_transaksi_ca(coa,nama)`, `fins_level_approve`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/api/fins/pengajuan-ca/route.ts`, `[idBuku]/route.ts`, `approve-all/route.ts`, `line/[id]/route.ts`, `line/[id]/approve/route.ts`
- `app/api/fins/pencairan/route.ts`, `pencairan/[id]/route.ts`, `pencairan/saldo-bank/route.ts`
- `app/(admin)/fins/pengajuan-ca/page.tsx`, `app/(admin)/fins/pencairan/page.tsx`
- `lib/fins/schemas/ca.ts` (BARU, skema Zod bersama)

## 6. Langkah implementasi (berurutan)
1. Branch dari `main` terbaru.
2. Buat `lib/fins/schemas/ca.ts`: `caHeaderSchema` (officeId int, sumberDana, departmentId nullable, tanggal ISO, viaBayar enum `bank|cash`, bankAccount string), `caLineSchema` (coa, namaAkun, quantity ≥1, nominal >0, keterangan ≤ 1000).
3. POST pengajuan: `safeParse` → 400; simpan `via_bayar = header.viaBayar`, `bank_rek_id` = id rekening bila `bank` (saat ini `coa_kredit` diisi `bankAccount` — pertahankan, tambah `bank_rek_id`).
4. Semua PATCH approve: transisi diizinkan saja (`us→as|rs`, `as→a|r`), `WHERE approve = <status_lama>` supaya idempoten; `user_approve` = nama session.
5. Pencairan PATCH `[id]`: tambah Zod, isi `pencair`, `tanggal_cair`, `no_resi` (bila ada), `via_bayar`, `bank_rek_id`; `realisasi = nominal*quantity` (logika lama dipertahankan).
6. Setelah tulis: `redis.del('fins:ca:list','fins:pencairan:list','fins:dashboard-cash')`.
7. UI: filter status/kantor/periode (sudah ada di API) + tombol **Ekspor CSV** sisi klien.
8. PR.

## 7. Aturan bisnis & validasi
- Tidak boleh cairkan bila `approve <> 'as'`; tidak boleh ubah baris `a`/`aj`/`asj`.
- `via_bayar='bank'` → `bank_rek_id` wajib & `fins_bank_rek.active='y'`.
- Batas nominal per jabatan dari `fins_level_approve.expend_min/max`: tampilkan peringatan saja (pemetaan role belum ada).
- `id_buku` tetap `CA00yymmdd###0001` (fungsi lama).

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Body salah → 400 dengan pesan field.
- [ ] `via_bayar` & `bank_rek_id` tersimpan saat ajukan & cairkan.
- [ ] Cairkan dua kali → kedua tidak mengubah apa-apa (409/0 row).
- [ ] Ekspor CSV sesuai filter.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Ajukan CA 2 baris via bank → cek DB `via_bayar='bank'`, `bank_rek_id` terisi, `approve='us'`.
2. Approve submission → `as`; cairkan → `a`, `realisasi = nominal*qty`, `tanggal_cair` hari ini.
3. Klik cairkan lagi (tab lain) → ditolak.
4. Ekspor CSV filter kantor Pusat.

## 10. Belum pasti / perlu konfirmasi
- Arti `coa_kredit` = rekening bank (pola lama) vs `bank_rek_id`: dipertahankan keduanya.
- Role approver ↔ `fins_level_approve.jabatan` belum ada di session; hanya peringatan.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
