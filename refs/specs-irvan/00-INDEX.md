# Spesifikasi Task Pak Irvan — Keuangan/FINS (urut dari paling mandiri → paling bergantung)

Repo: `irvanfreelance/web_cf_darulhikam_admin` · Prototype acuan UI: `irvanfreelance/lazdarulhikam_protoype`

Aturan kerja: 1 task = 1 branch dari `main` terbaru = 1 PR, merge di hari yang sama. Pak Irvan hanya coding + commit + PR; Bot review/build/QA di slot **16:00 WIB** lalu flip menu sidebar.

## Urutan & jadwal

| # | File | Backlog | Tanggal | Branch | Butuh dari Bot | Dependensi |
|---|---|---|---|---|---|---|
| 01 | [01-profile-lembaga-program.md](01-profile-lembaga-program.md) | K16 | Sen 2 Nov 2026 | `feat/fins-profile-program` | BOT-S01 | tidak ada (task paling mandiri). |
| 02 | [02-ca-pencairan-gap.md](02-ca-pencairan-gap.md) | K02 | Sen 2 Nov 2026 | `feat/fins-ca-pencairan-gap` | — | tidak ada. |
| 03 | [03-posting-jurnal-rekap-jurnal.md](03-posting-jurnal-rekap-jurnal.md) | K10 | Sel 3 Nov 2026 | `feat/fins-posting-rekap-jurnal` | BOT-S01 | 02. |
| 04 | [04-dashboard-cash-bank.md](04-dashboard-cash-bank.md) | K01 | Rab 4 Nov 2026 | `feat/fins-dashboard-cash-bank` | — | 03 (jurnal terisi lewat helper). |
| 05 | [05-lpj-ca.md](05-lpj-ca.md) | K03 | Kam 5 Nov 2026 | `feat/fins-lpj-ca` | BOT-S01 | 02, 03. |
| 06 | [06-penerimaan.md](06-penerimaan.md) | K04 | Jum 6 Nov 2026 | `feat/fins-penerimaan` | — | 01 (program), 03. |
| 07 | [07-pengeluaran-mutasi.md](07-pengeluaran-mutasi.md) | K05 | Sen 9 Nov 2026 | `feat/fins-pengeluaran-mutasi` | — | 03, 06 (form & pola approve). |
| 08 | [08-buku-harian.md](08-buku-harian.md) | K06 | Sel 10 Nov 2026 | `feat/fins-buku-harian` | — | 03, 06, 07. |
| 09 | [09-saldo-awal.md](09-saldo-awal.md) | K09 | Sel 10 Nov 2026 | `feat/fins-saldo-awal` | — | 03, 08 (`lib/fins/saldo.ts`). |
| 10 | [10-penutupan.md](10-penutupan.md) | K07 | Rab 11 Nov 2026 | `feat/fins-penutupan` | — | 08, 09. |
| 11 | [11-buku-besar.md](11-buku-besar.md) | K11 | Kam 12 Nov 2026 | `feat/fins-buku-besar` | — | 03, 09. |
| 12 | [12-trial-balance.md](12-trial-balance.md) | K12 | Jum 13 Nov 2026 | `feat/fins-trial-balance` | — | 09, 10, 11. |
| 13 | [13-rumus-report.md](13-rumus-report.md) | K13 | Sen 16 Nov 2026 | `feat/fins-rumus-report` | — | 12 (untuk pratinjau angka). |
| 14 | [14-resume-dana-pengelola.md](14-resume-dana-pengelola.md) | K08 | Sel 17 Nov 2026 | `feat/fins-resume-dp` | BOT-S01 | 01 (fins_program.dp_percent), 06, 12. |
| 15 | [15-aset-entry-list.md](15-aset-entry-list.md) | K15 | Rab 18 Nov 2026 | `feat/fins-aset` | — | 03, 10, 12. |
| 16 | [16-laporan-keuangan-bulanan.md](16-laporan-keuangan-bulanan.md) | K14 | Kam 19 Nov 2026 | `feat/fins-laporan-keuangan` | — | 01 (kop), 09, 10, 12, 13, 14, 15 — **semua**. |

## Graf dependensi
```
BOT-S01 (Sen 2 Nov 08:00: migrasi 001 — npwp, fins_program, kolom LPJ, indeks)
  ├─► 01 Profile+Program ───────────────┬─► 06 Penerimaan ─► 07 Pengeluaran+Mutasi ─► 08 Buku Harian
  │                                     │                                               │
  └─► 05 LPJ CA                         └─► 14 Resume DP                                ▼
02 CA&Pencairan ─► 03 Helper Posting + Rekap Jurnal ─► 04 Dashboard Cash Bank      09 Saldo Awal
                     │   (dipakai juga Bot: P09 Cairkan Penyaluran, C05 FINS Sync)      │
                     │                                                                  ▼
                     ├──────────────────────────────────────────────────────────► 10 Penutupan
                     │                                                         11 Buku Besar ◄─ 09
                     │                                         10 + 11 ─► 12 Trial Balance ─► 13 Rumus Report
                     └─► 15 Aset (butuh 03, 10, 12)
01 + 09 + 10 + 12 + 13 + 14 + 15 ─► 16 Laporan Keuangan + Bulanan (TERAKHIR)
```

## Kepemilikan folder
- **Pak Irvan**: `app/(admin)/fins/**`, `app/api/fins/**`, `lib/fins/**`, `components/fins/**`.
- **Bot**: sidebar/layout/shared/ui/lib inti/types, `db/migrations/**` (satu-satunya jalur migrasi, bernomor, aditif), semua Penyaluran & CRM.
- Bot memakai `lib/fins/posting.ts` (read-only, tidak mengubah) untuk P09 & C05.

## Buffer
- Jum 20 – Jum 27 Nov: buffer revisi/bugfix FINS (maks 1–2 PR kecil/hari), tanpa fitur baru.

## Catatan penting lintas task
- `accounting_periods` Mei–Des 2026 berstatus **closed** di DB → putuskan sebelum task 03 (lihat 03 §10).
- Dokumen `03_fins_triggers.md` menyarankan `DELETE fins_jurnal` saat revert — **tidak diikuti**; pakai jurnal balik.
