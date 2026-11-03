# 05 — Pertanggungjawaban (LPJ) CA
> Backlog: **K03** · PIC: **Pak Irvan** · Tanggal: **Kam 5 Nov 2026** · Estimasi: 2 sesi (1 hari, 1 PR)
> Branch: `feat/fins-lpj-ca` · PR: **feat(fins): LPJ Cash Advance + pengembalian**

## 1. Tujuan
Pemegang CA melaporkan realisasi pemakaian, upload bukti, mengembalikan sisa / menerima kekurangan; finance approve LPJ; jurnal selisih otomatis.

## 2. Dependensi
- Task sebelumnya: 02, 03.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): **BOT-S01** (Sen 2 Nov): kolom LPJ di `fins_ca_pengajuan`.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Pertanggungjawaban CA` → `/fins/pertanggungjawaban-ca`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/Pertanggungjawaban.jsx`
- store: `src/utils/pertanggungjawabanStore.js`

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_ca_pengajuan` kolom ada: `approve` (`a`→`aj`→`asj`), `realisasi` (= jumlah dicairkan), `nominal, quantity, coa_debet, coa_kredit, office_id, pencair, tanggal_cair`.
- **BARU (Bot S01)**: `tgl_lpj date NULL`, `nominal_lpj numeric(20,2) NOT NULL DEFAULT 0`, `bukti_lpj_url text NULL`, `user_lpj varchar(150) NOT NULL DEFAULT ''`, `pengembali varchar(150) NOT NULL DEFAULT ''`, `user_approve_lpj varchar(150) NOT NULL DEFAULT ''`.
- Selisih **tidak disimpan**: `selisih = realisasi − nominal_lpj` (dihitung).
- Jurnal via helper task 03.

## 5. File target (repo web_cf_darulhikam_admin)
- `app/(admin)/fins/pertanggungjawaban-ca/page.tsx`
- `app/api/fins/lpj-ca/route.ts` (GET list `approve IN ('a','aj','asj')`)
- `app/api/fins/lpj-ca/[id]/route.ts` (PATCH submit)
- `app/api/fins/lpj-ca/[id]/approve/route.ts`

## 6. Langkah implementasi (berurutan)
1. Branch dari `main`; cek kolom baru ada.
2. Submit LPJ (pemegang): Zod `{nominalLpj ≥0, tglLpj, buktiUrl, pengembali?}`; upload bukti `@vercel/blob`; `UPDATE … SET approve='aj' … WHERE id=$1 AND approve='a'`.
3. Approve LPJ (finance), di `withTransaction`:
   a. `UPDATE … approve='asj', user_approve_lpj … WHERE approve='aj'`.
   b. Jurnal realisasi beban: debet COA beban (`coa_debet` baris) / kredit COA uang muka CA — lewat `postTransaksi`.
   c. Bila `selisih>0` (sisa dikembalikan): debet kas/bank, kredit uang muka. Bila `<0` (kurang bayar): debet uang muka, kredit kas/bank.
4. Tolak LPJ: kembali ke `a` + catatan (tidak hapus).
5. UI: tab Belum LPJ / Menunggu Approve / Selesai, kolom selisih berwarna.
6. `redis.del('fins:ca:*','fins:dashboard-cash:*')`. PR.

## 7. Aturan bisnis & validasi
- LPJ hanya untuk `approve='a'`.
- `nominal_lpj` > `realisasi`×1,5 → wajib catatan.
- Bukti wajib bila `nominal_lpj > 0`.

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Status a→aj→asj tercatat.
- [ ] Jurnal seimbang termasuk selisih.
- [ ] Tolak tidak menghapus data.
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. CA cair Rp1.000.000, LPJ Rp800.000 → approve → 2 transaksi: beban 800rb, pengembalian 200rb.
2. LPJ Rp1.200.000 → kekurangan 200rb terjurnal.
3. Tolak LPJ → status kembali `a`.

## 10. Belum pasti / perlu konfirmasi
- COA uang muka CA: sample memakai `coa_debet='101.10.001.000'` saat cair. Apakah beban = COA di `fins_jenis_transaksi_ca`? Perlu konfirmasi bagan akun.
- Bila LPJ per baris rincian (bukan per baris CA) dibutuhkan, perlu tabel `fins_ca_lpj_line` (belum ada) — beri tahu Bot.

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
