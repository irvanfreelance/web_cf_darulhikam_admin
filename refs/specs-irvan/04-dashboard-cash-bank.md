# 04 — Dashboard Cash Bank
> Backlog: **K01** · PIC: **Pak Irvan** · Tanggal: **Rab 4 Nov 2026 (sesi 1)** · Estimasi: 1 sesi
> Branch: `feat/fins-dashboard-cash-bank` · PR: **feat(fins): Dashboard Cash Bank**

## 1. Tujuan
Ringkasan saldo kas & bank per rekening/kantor, mutasi hari ini, dan CA berjalan, dibaca dari jurnal + opname.

## 2. Dependensi
- Task sebelumnya: 03 (jurnal terisi lewat helper).
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Dashboard Cash Bank` → `/fins/dashboard-cash-bank`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/DashboardCashBank.jsx`
- komponen: `components/shared/kpi-card.tsx` (import saja), grafik `recharts`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_bank_rek(id_rekening, id_bank, keterangan, coa, active)`; `fins_kantor_coa(id_kantor, coa_cash, coa_non_cash)`.
- `fins_opname` saldo terakhir: `tanggal, coa, saldo_akhir, per='d', via='coa', id_kantor`.
- `fins_jurnal(coa, debet, kredit, tgl_exre, id_kantor)` untuk mutasi setelah tanggal opname terakhir.
- `fins_ca_pengajuan` status `as` (menunggu cair) & `a` (belum LPJ).

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/dashboard-cash-bank/page.tsx`
- `app/api/fins/dashboard-cash-bank/route.ts`
- `components/fins/cash-bank-cards.tsx`

## 6. Langkah implementasi (berurutan)
1. Branch dari `main`.
2. API: daftar COA kas/bank = `fins_bank_rek.coa (active='y')` ∪ `fins_kantor_coa.coa_cash/coa_non_cash`.
3. Saldo per COA = `saldo_akhir` opname harian terakhir (`per='d'`) + Σ(debet−kredit) jurnal sesudah tanggal itu.
4. KPI: total kas, total bank, mutasi masuk/keluar hari ini, CA menunggu cair (Σ nominal*qty `as`), CA belum LPJ (`a`).
5. Grafik tren 30 hari (Σ harian dari jurnal).
6. Cache Redis 60 detik `fins:dashboard-cash:<kantor>`.
7. Filter kantor. PR.

## 7. Aturan bisnis & validasi
- Saldo normal kas/bank = debet (cek `fins_coa.saldo='d'`).
- Hanya COA `active='y'`.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Angka saldo = hitung manual dari opname + jurnal.
- [ ] Filter kantor jalan.
- [ ] Halaman < 2 detik (cache).
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Catat saldo bank X; cairkan CA dari bank X → refresh (tunggu cache/tombol refresh) → saldo turun sesuai.
2. Ganti kantor → angka berubah.

## 10. Belum pasti / perlu konfirmasi
- Pemetaan `fins_opname.via` (coa/user/rekon1/rekon2) dan `id_via_bayar` '0/1/2' belum pasti; pakai `via='coa'`.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
