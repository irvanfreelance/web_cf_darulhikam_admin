# 10 — Penutupan (harian/bulanan) + status periode
> Backlog: **K07** · PIC: **Pak Irvan** · Tanggal: **Rab 11 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-penutupan` · PR: **feat(fins): Penutupan harian/bulanan & periode**

## 1. Tujuan
Opname kas fisik harian (pecahan kertas/logam), penutupan bulanan per COA, dan buka/tutup `accounting_periods`.

## 2. Dependensi
- Task sebelumnya: 08, 09.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Penutupan` → `/fins/penutupan`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/Penutupan.jsx`
- store: `src/utils/penutupanStore.js`
- cron rancangan: 03_fins_triggers.md Cron 1–3

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_opname`: `tanggal, coa, saldo_awal, debet, kredit, adjustment, saldo_akhir, detail_kertas text, detail_logam text, nik_input, id_kantor, id_via_bayar, active, updated, per d|m|y, keterangan, via coa|user|rekon1|rekon2, period_id`.
- `accounting_periods`: `status open→closing→closed, total_penerimaan, total_pengeluaran, surplus_defisit, nik_closing, tgl_closing, tgl_closed, catatan`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/penutupan/page.tsx` (tab Harian | Bulanan | Periode)
- `app/api/fins/penutupan/harian/route.ts`, `bulanan/route.ts`, `periode/[id]/route.ts`
- `lib/fins/opname.ts`

## 6. Langkah implementasi (berurutan)
1. Branch.
2. Harian: hitung saldo sistem (task 08) → user isi pecahan (`detail_kertas`/`detail_logam` JSON string) → `adjustment = fisik − sistem` → UPSERT `per='d', via='user'`.
3. Bulanan: untuk tiap COA, UPSERT `per='m', via='coa'` (saldo awal bulan, Σdebet, Σkredit, saldo akhir).
4. Periode: `open→closing` (cek: semua trans bulan itu bukan `u`, saldo awal seimbang) → `closing→closed` (isi total, `nik_closing`, `tgl_closed`). Buka kembali `closed→open` hanya dengan catatan.
5. Semua UPSERT, tidak ada delete. PR.

## 7. Aturan bisnis & validasi
- Tidak bisa tutup bulan bila ada `fins_trans.approve='u'` di bulan itu.
- `adjustment ≠ 0` wajib keterangan.
- Setelah `closed`, helper task 03 menolak posting.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Opname harian tersimpan dengan pecahan.
- [ ] Tutup bulan menghitung total & mengunci posting.
- [ ] Re-open tercatat di `catatan`.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Opname kas hari ini fisik beda 1.000 → adjustment −1.000.
2. Coba tutup bulan dengan 1 penerimaan draf → ditolak.
3. Tutup periode uji → coba posting → 409.

## 10. Belum pasti / perlu konfirmasi
- Status periode data saat ini (Mei–Des 2026 `closed`) — lihat task 03.
- Apakah adjustment opname harus menghasilkan jurnal selisih kas? Default: tidak, hanya dicatat.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
