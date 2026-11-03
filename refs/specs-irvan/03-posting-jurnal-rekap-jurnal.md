# 03 — Helper Posting Jurnal + Rekap Jurnal (poros semua modul)
> Backlog: **K10** · PIC: **Pak Irvan** · Tanggal: **Sel 3 Nov 2026** · Estimasi: 2 sesi (1 hari penuh, 1 PR)
> Branch: `feat/fins-posting-rekap-jurnal` · PR: **feat(fins): helper posting fins_trans→fins_jurnal + Rekap Jurnal**

## 1. Tujuan
Satu helper resmi `lib/fins/posting.ts` untuk membuat `fins_trans` + 2 baris `fins_jurnal` (debet & kredit) dalam satu transaksi, plus jurnal balik. Semua modul (Pencairan, LPJ, Penerimaan, Pengeluaran, Aset, dan modul Bot: Penyaluran P09, CRM C05) **wajib** lewat helper ini. Plus halaman **Rekap Jurnal** (list + filter + jurnal manual/penyesuaian). Pencairan CA langsung jadi konsumen pertama.

## 2. Dependensi
- Task sebelumnya: 02.
- Butuh dari Bot (harus sudah merge **sebelum** tanggal ini): tidak ada kolom baru. **BOT-S01** (indeks `fins_jurnal(coa,tgl_exre)`, `fins_jurnal(fins_trans_id)`, `fins_trans(tgl_exre)`) sudah jalan Sen 2 Nov.
- Setelah merge: Bot ubah href menu di sidebar (slot QA 16:00 WIB) → `Rekap Jurnal` → `/fins/rekap-jurnal`.

## 3. Acuan prototype (lazdarulhikam_protoype, hanya UI)
- `src/pages/RekapJurnal.jsx`
- store: `src/utils/jurnalStore.js`, `src/utils/finsLedgerStore.js`, `src/utils/accountingStore.js`
- Desain alur: `markdown_darul_hikam/03_fins_triggers.md` (Workflow 2, 4, 5; mapping `mutasi→via_jurnal`)

## 4. Tabel & kolom DB (nyata, dari dh_schema)
- `fins_trans` (1 baris): `id, id_trans varchar(20) UNIQUE, id_transaksi, id_exre varchar(20), coa_ca, coa_debet, coa_kredit, nominal numeric>0, keterangan varchar(500), nik_input varchar(20), nik_input_atasan, tgl_exre timestamptz, fdt, realisasi, coa, nik_approve, id_kantor int, id_via_bayar int, approve varchar(3), jenis r|e, mutasi varchar(2), nik_cair, id_program int, id_contact, noresi varchar(16), total, quantity ≥1, id_jabatan, kinerja Kinerja|Komersil, note, dtu, crowdfunding_transaction_id, crowdfunding_transaction_created_at, period_id → accounting_periods (RESTRICT, nullable)`.
- `fins_jurnal` (2 baris): `id, id_jurnal varchar(22) UNIQUE, id_transaksi, id_exre, coa, debet, kredit` (CHECK tepat satu sisi >0), `keterangan varchar(200), nik_input varchar(20), tgl_exre date, id_kantor, id_via_bayar smallint, jenis r|e, via_jurnal smallint, id_trans varchar(20), note, fdt, coa_buku, noresi varchar(16), id_program, kinerja, dtu, fins_trans_id → fins_trans (CASCADE), period_id`.
- `accounting_periods`: `id, periode_bulan, periode_tahun, status open|closing|closed`, UNIQUE(bulan,tahun).
- `period_adjusting_entries`: `period_id, jenis_aje (akrual|depresiasi|koreksi|penutup|balik), keterangan, coa_debet, coa_kredit, nominal bigint, fins_trans_id, fins_jurnal_debet_id, fins_jurnal_kredit_id, is_reversal, reversal_of_id, nik_input, approved_by, approved_at`.
- Contoh data nyata: `fins_trans.id_trans='261024185214094788'` (18 char), jurnal `id_jurnal = id_trans+'1'` (debet) / `+'2'` (kredit), `id_exre = id_buku CA`.

## 5. File target (repo web_cf_darulhikam_admin)
- `lib/fins/posting.ts` (BARU): `postTransaksi(client, input)`, `reverseTransaksi(client, finsTransId, alasan)`
- `lib/fins/id-trans.ts` (BARU): `generateIdTrans(date)` = `YYMMDDHHmmss` + 6 digit acak
- `lib/fins/via-jurnal.ts` (BARU): `getViaJurnal(mutasi)`
- `lib/fins/period.ts` (BARU): `resolvePeriod(client, tgl)` → `{id,status}`
- `app/api/fins/rekap-jurnal/route.ts` (GET list, POST jurnal manual)
- `app/(admin)/fins/rekap-jurnal/page.tsx`
- ubah `app/api/fins/pencairan/[id]/route.ts`: saat `as→a` panggil `postTransaksi`

## 6. Langkah implementasi (berurutan)
1. Branch dari `main`.
2. `id-trans.ts`, `via-jurnal.ts` persis seperti 03_fins_triggers.md (mapping: `2,4→1`, `e→2`, `1,3,6,10→3`, lain `0`).
3. `period.ts`: `SELECT id,status FROM accounting_periods WHERE periode_tahun=$1 AND periode_bulan=$2`; tidak ada → `period_id=null`; `closed` → lempar `PeriodClosedError`.
4. `postTransaksi(client, {jenis, coaDebet, coaKredit, nominal, quantity, tglExre, keterangan, idExre, idKantor, idViaBayar, mutasi, idProgram, kinerja, nikInput, noresi, approve, crowdfunding?})`:
   a. validasi Zod; `coaDebet ≠ coaKredit`; kedua COA ada di `fins_coa` & `active='y'` & `parent='n'`.
   b. INSERT `fins_trans` (`total = nominal*quantity`) RETURNING id, id_trans.
   c. INSERT 2 `fins_jurnal`: debet (`id_jurnal=id_trans+'1'`, `debet=total`), kredit (`+'2'`, `kredit=total`); isi `id_trans`, `fins_trans_id`, `period_id`, `via_jurnal`.
   d. Kembalikan `{finsTransId, idTrans}`. Dipanggil **di dalam** `withTransaction` pemanggil.
5. `reverseTransaksi`: TIDAK menghapus. Buat `fins_trans` baru sisi terbalik (keterangan `BALIK: …`, `note` = id asal) + 2 jurnal, set `approve='r'` pada trans asal; catat `period_adjusting_entries(jenis_aje='balik', is_reversal=true, reversal_of_id=<id pae asal bila ada>)`.
6. Pencairan: di `withTransaction` ubah `as→a` lalu `postTransaksi({jenis:'e', coaDebet: row.coa_debet, coaKredit: row.coa_kredit, idExre: id_buku, approve:'a', ...})`.
7. Rekap Jurnal API: filter tanggal, kantor, coa, jenis, keyword (`id_exre`, keterangan); paginasi server (`LIMIT/OFFSET`); total debet/kredit di footer.
8. POST jurnal manual = `postTransaksi` + baris `period_adjusting_entries` (`jenis_aje` dari form).
9. Unit test kecil (bila ada runner) atau skrip uji di PR description.
10. PR.

## 7. Aturan bisnis & validasi
- Σdebet = Σkredit per `fins_trans_id` (selalu 2 baris sama besar).
- Tolak posting ke periode `closed`.
- `keterangan` dipotong 200 char untuk jurnal (kolom varchar(200)); `nik_input` maks 20 char → isi NIK/username, bukan nama panjang.
- Jurnal hanya dibuat bila `tgl_exre` ada, COA debet & kredit terisi, `approve ∈ {a, as, aj, asj, ac}` (aturan trigger lama).
- Koreksi = jurnal balik, **bukan** UPDATE/DELETE jurnal (dokumen 03 menyebut DELETE — sengaja tidak diikuti).

### Standar wajib (AGENTS.md)
- Semua route: validasi **Zod** (body & query), `getServerSession` wajib, 401 bila tak login.
- SQL mentah via `query` / `withTransaction` dari `@/lib/db` (tanpa ORM), parameter `$n`, tanpa string concat input user.
- Tulis 2 tabel atau lebih → `withTransaction` (BEGIN…COMMIT).
- Setelah tulis → `redis.del()` key cache terkait (pola `fins:<modul>:*`).
- Nominal pakai `numeric` → kirim sebagai string/number, format tampilan pakai `lib/format.ts`.

## 8. Acceptance criteria
- [ ] Cairkan CA → 1 `fins_trans` + 2 `fins_jurnal` seimbang, `id_jurnal` sesuai pola.
- [ ] Gagal di tengah → tidak ada baris parsial (rollback).
- [ ] Periode closed → 409 pesan "Periode … sudah ditutup".
- [ ] Rekap Jurnal filter + total seimbang; jurnal manual tercatat di `period_adjusting_entries`.
- [ ] Helper diekspor dan terdokumentasi (JSDoc) untuk dipakai Bot (P09, C05).
- [ ] `npm run build` lulus tanpa error TS/ESLint baru.
- [ ] Tidak ada file di luar folder Pak Irvan yang berubah.

## 9. QA manual
1. Ajukan → approve → cairkan CA Rp 500.000 → cek `SELECT * FROM fins_jurnal WHERE fins_trans_id=…` = 2 baris, total sama.
2. Rekap Jurnal filter tanggal hari ini → baris muncul, footer debet=kredit.
3. Buat jurnal manual koreksi → muncul + baris `period_adjusting_entries`.
4. Balik transaksi → 2 jurnal lawan muncul, saldo COA kembali nol.

## 10. Belum pasti / perlu konfirmasi
- **Periode Nov 2026 di `accounting_periods` berstatus `closed`** (id 7; Mei–Des 2026 semua closed, 2027 open). Kalau aturan 'tolak closed' dipakai, semua posting Nov akan gagal. Perlu keputusan Pak Irvan: buka periode (UPDATE data → lewat Bot dengan izin) atau sementara hanya peringatan.
- `id_via_bayar` (0/1/2) artinya belum terdokumentasi; sample: CA bank = 1.
- `nik_input` sample berisi nama ('Ahmad Faisal') padahal varchar(20).

## 11. Larangan
- Tidak ada `DROP` / `DELETE` / `TRUNCATE` / `RESET` / `ALTER` di kode maupun SQL. Pembatalan = status (`r`/`rs`) atau jurnal balik, **bukan** hapus baris. Catatan: `fins_jurnal.fins_trans_id` ber-FK `ON DELETE CASCADE` → menghapus `fins_trans` ikut menghapus jurnal, jadi jangan pernah.
- Jangan sentuh file bersama (milik Bot): `components/admin/sidebar.tsx`, `app/(admin)/layout.tsx`, `components/shared/*`, `components/ui/*`, `lib/{db,redis,api,format,utils}.ts`, `types/*`, `db/migrations/*`, `scripts/migrate*.ts`, `package.json`. Perlu perubahan di situ → tulis di deskripsi PR, Bot yang kerjakan.
- Jangan jalankan `markdown_darul_hikam/07–16*.sql` (diawali `DROP TABLE … CASCADE`).
- Jangan buat kolom/tabel sendiri. Kolom baru hanya lewat migrasi bernomor milik Bot.
- Jangan commit kredensial / `.env`.
- Folder Pak Irvan: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
