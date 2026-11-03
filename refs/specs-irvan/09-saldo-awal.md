# 09 — Saldo Awal COA
> Backlog: **K09** · PIC: **Pak Irvan** · Tanggal: **Sel 10 Nov 2026 (sesi 2)** · Estimasi: 1 sesi
> Branch: `feat/fins-saldo-awal` · PR: **feat(fins): input Saldo Awal COA**

## 1. Tujuan
Input/impor saldo awal per COA per kantor pada tanggal mulai pembukuan, menjadi titik nol Buku Besar & Trial Balance.

## 2. Dependensi
- Task sebelumnya: 03, 08 (`lib/fins/saldo.ts`).
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada (memakai `fins_opname`, tanpa tabel baru).
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Saldo Awal` → `/fins/saldo-awal`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/SaldoAwal.jsx`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_opname` PK `(tanggal, coa, id_kantor, per, via)`: isi `per='y'`, `via='user'`, `saldo_awal`, `saldo_akhir` (= saldo_awal), `debet=0, kredit=0, adjustment=0`, `id_via_bayar='0'`, `active='y'`, `keterangan='Saldo Awal'`, `nik_input`.
- `fins_coa(coa, nama_coa, parent, saldo d|k, active)`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/saldo-awal/page.tsx`
- `app/api/fins/saldo-awal/route.ts` (GET, PUT upsert batch)
- `app/api/fins/saldo-awal/import/route.ts` (CSV)

## 6. Langkah implementasi (berurutan)
1. Branch.
2. GET: semua COA `parent='n'` + saldo awal (LEFT JOIN opname `per='y' AND via='user'` pada tanggal pilihan).
3. PUT: batch `INSERT … ON CONFLICT (tanggal,coa,id_kantor,per,via) DO UPDATE` (UPSERT, bukan delete-insert).
4. Tampilkan total sisi debet vs kredit (berdasar `fins_coa.saldo`) dan selisih.
5. Impor CSV `coa,saldo`. 6. Update `lib/fins/saldo.ts`: opname `per='y',via='user'` ikut dihitung sebagai titik awal.
7. PR.

## 7. Aturan bisnis & validasi
- Hanya COA level daun (`parent='n'`).
- Total debet harus = total kredit sebelum 'Kunci'; tombol simpan tetap bisa (draf), tapi tampilkan merah.
- Tidak bisa ubah saldo awal bila periode sesudahnya `closed`.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Upsert idempoten.
- [ ] Selisih 0 → badge seimbang.
- [ ] Buku Harian memakai saldo awal ini.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Isi saldo awal 3 COA (kas 10jt D, bank 5jt D, aset neto 15jt K) → seimbang.
2. Buku Harian kas sesudah tanggal itu mulai dari 10jt.

## 10. Belum pasti / perlu konfirmasi
- **Keputusan desain**: tidak membuat `fins_saldo_awal`, memakai `fins_opname (per='y', via='user')`. Kalau Pak Irvan lebih suka tabel terpisah, minta Bot buat migrasi dulu.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
