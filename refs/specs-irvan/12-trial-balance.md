# 12 — Trial Balance (Neraca Saldo)
> Backlog: **K12** · PIC: **Pak Irvan** · Tanggal: **Jum 13 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-trial-balance` · PR: **feat(fins): Trial Balance**

## 1. Tujuan
Neraca saldo per periode: saldo awal, mutasi debet/kredit, penyesuaian, saldo akhir untuk semua COA, dengan cek seimbang.

## 2. Dependensi
- Task sebelumnya: 09, 10, 11.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Trial Balance` → `/fins/trial-balance`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/TrialBalance.jsx`
- store: `src/utils/accountingStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_jurnal`, `fins_opname` (saldo awal `per='y'/'m'`), `period_adjusting_entries` (kolom penyesuaian), `fins_coa`, `accounting_periods`.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/trial-balance/page.tsx`
- `app/api/fins/trial-balance/route.ts`
- `lib/fins/trial-balance.ts` (dipakai task 16)

## 6. Langkah implementasi (berurutan)
1. Branch.
2. `lib/fins/trial-balance.ts`: `getTrialBalance(client,{periodId|from,to, kantor})` → baris per COA daun + subtotal per level.
3. Pisahkan jurnal penyesuaian (`fins_trans_id IN (SELECT fins_trans_id FROM period_adjusting_entries WHERE period_id=…)`).
4. UI: kolom SA D/K, Mutasi D/K, Penyesuaian D/K, Saldo Akhir D/K; baris total; badge seimbang.
5. Ekspor CSV. PR.

## 7. Aturan bisnis & validasi
- Σ debet = Σ kredit di setiap kolom; jika tidak, tampilkan COA penyebab (jurnal tanpa pasangan).

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Seimbang untuk data QA.
- [ ] Saldo akhir per COA = Buku Besar.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Pilih periode berjalan → total seimbang.
2. Bandingkan 3 COA dengan Buku Besar.

## 10. Belum pasti / perlu konfirmasi
- Periode berbasis `accounting_periods` vs tanggal bebas — sediakan keduanya.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
