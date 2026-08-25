# FINS Trigger Logic — Upstash Workflow & Cron Migration

> **Catatan:** Semua trigger MySQL FINS telah dihapus dari skema PostgreSQL.
> Trigger yang menulis ke tabel `*_log` dihapus sepenuhnya.
> Trigger business logic dikonversi menjadi **Upstash Workflow** (async event-driven)
> dan **Upstash QStash Cron** (scheduled jobs), dengan state tracking di tabel `fins_upstash_events`.

---

## Ringkasan Trigger Asal → Target

| MySQL Trigger | Target | Keterangan |
|---|---|---|
| `fins_bank_before_update` | ❌ Dihapus | `dtu` diganti `DEFAULT NOW()` di PG |
| `fins_bank_rek_before_update` | ❌ Dihapus | idem |
| `fins_budget_before_update` | ❌ Dihapus | idem |
| `fins_coa_before_update` | ❌ Dihapus | idem |
| `fins_opname_before_update` | ❌ Dihapus | idem |
| `fins_report_before_update` | ❌ Dihapus | idem |
| `fins_saldo_dana_before_update` | ❌ Dihapus | idem |
| `fins_trans_before_insert` | ✅ Upstash Workflow | Validasi + generate `id_trans` |
| `fins_trans_before_update` | 🗑️ LOG dihapus | Sisa logika → Upstash Workflow |
| `fins_trans_after_insert` | ✅ Upstash Workflow | Auto-buat jurnal double-entry |
| `fins_trans_after_update` | ✅ Upstash Workflow | Update/recreate jurnal saat approve berubah |
| `fins_trans_after_delete` | ✅ FK CASCADE | Jurnal auto-terhapus via FK `fins_jurnal.fins_trans_id` |
| `fins_trans_before_delete` | 🗑️ LOG dihapus | — |
| `fins_jurnal_before_insert` | ✅ App Layer | Generate `id_jurnal` = `id_trans` + '1'/'2' |
| `fins_jurnal_before_update` | 🗑️ LOG dihapus | — |
| `fins_jurnal_after_insert` | ✅ Upstash Cron | `thisyear` cleanup → cron tahunan |
| `fins_jurnal_after_update` | ✅ Upstash Workflow | Sync state |
| `fins_jurnal_after_delete` | ✅ FK CASCADE | Auto via relasi |

---

## Workflow 1 — `INVOICE_PAID`: Pembayaran Donasi Dikonfirmasi

**Trigger Asal MySQL:** Tidak ada di FINS; ini adalah entry point baru dari crowdfunding.

**Kapan dijalankan:** Saat webhook Xendit/Midtrans menerima konfirmasi pembayaran, status invoice diubah ke `PAID`.

**Implementasi:** `POST /api/webhooks/xendit` atau `POST /api/webhooks/midtrans`

### Alur (Upstash Workflow Steps)

```typescript
// lib/workflows/invoice-paid.ts
import { serve } from "@upstash/workflow/nextjs";

export const { POST } = serve<{
  invoice_id: number;
  invoice_created_at: string;
  invoice_code: string;
  base_amount: number;
  admin_fee: number;
  total_amount: number;
  campaign_id: number;
  payment_method_code: string;
  fins_coa_debet: string;
  fins_mutasi: string;
  donor_name: string;
}>(async (context) => {
  const {
    invoice_id, invoice_created_at, invoice_code,
    base_amount, admin_fee, total_amount,
    campaign_id, fins_coa_debet, fins_mutasi, donor_name,
  } = context.requestPayload;

  // Step 1: Ambil COA receipt dari fins_campaign_coa
  const campaignCoa = await context.run("fetch-campaign-coa", async () => {
    const row = await db.query(
      `SELECT coa_receipt, coa_fund FROM fins_campaign_coa WHERE campaign_id = $1 AND is_primary = true`,
      [campaign_id]
    );
    if (!row) throw new Error(`COA tidak ditemukan untuk campaign ${campaign_id}`);
    return row;
  });

  // Step 2: Generate id_trans
  const idTrans = await context.run("generate-id-trans", async () => {
    const now = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, "0");
    const ts = [
      String(now.getFullYear()).slice(2), pad(now.getMonth() + 1), pad(now.getDate()),
      pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds()),
    ].join("");
    const rand = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
    return ts + rand; // 18 chars
  });

  // Step 3: Insert fins_trans (penerimaan donasi, approve='a' langsung karena PAID)
  const finsTransId = await context.run("insert-fins-trans", async () => {
    const result = await db.query(`
      INSERT INTO fins_trans (
        id_trans, id_transaksi, id_exre, coa_ca, coa_debet, coa_kredit,
        nominal, keterangan, nik_input, tgl_exre, fdt, coa, approve,
        jenis, mutasi, id_program, id_contact, noresi, total, quantity,
        id_kantor, id_via_bayar, kinerja,
        crowdfunding_invoice_id, crowdfunding_invoice_created_at
      ) VALUES (
        $1, $2, $2, $3, $4, $3,
        $5, $6, 'SYSTEM_API', NOW(), NOW(), $4, 'a',
        'r', $7, 0, $2, $8, $9, 1,
        1, 2, 'Komersil',
        $10, $11
      ) RETURNING id`,
      [
        idTrans,
        invoice_code,
        campaignCoa.coa_receipt,
        fins_coa_debet,
        base_amount,
        `Penerimaan Donasi - ${donor_name} - ${invoice_code}`,
        fins_mutasi,
        invoice_code.slice(-8),  // noresi = 8 char suffix
        total_amount,
        invoice_id,
        invoice_created_at,
      ]
    );
    return result.id as number;
  });

  // Step 4: Insert fins_jurnal double-entry (debet)
  await context.run("insert-jurnal-debet", async () => {
    const idJurnal = idTrans + "1";
    await db.query(`
      INSERT INTO fins_jurnal (
        id_jurnal, id_transaksi, id_exre, coa, debet, kredit,
        keterangan, nik_input, tgl_exre, id_kantor, id_via_bayar,
        jenis, via_jurnal, id_trans, fdt, coa_buku, noresi, fins_trans_id
      ) VALUES (
        $1, $2, $2, $3, $4, 0,
        $5, 'SYSTEM_API', CURRENT_DATE, 1, 2,
        'r', $6, $7, NOW(), $8, $9, $10
      )`,
      [
        idJurnal, invoice_code, fins_coa_debet, base_amount,
        `Penerimaan Donasi - ${invoice_code}`,
        fins_mutasi === 'e' ? 2 : (fins_mutasi === '4' ? 1 : fins_mutasi === '3' ? 3 : 1),
        idTrans, campaignCoa.coa_receipt, invoice_code.slice(-8), finsTransId,
      ]
    );
  });

  // Step 5: Insert fins_jurnal double-entry (kredit)
  await context.run("insert-jurnal-kredit", async () => {
    const idJurnal = idTrans + "2";
    const viaJurnal = fins_mutasi === 'e' ? 2 : fins_mutasi === '3' ? 3 : 1;
    await db.query(`
      INSERT INTO fins_jurnal (
        id_jurnal, id_transaksi, id_exre, coa, debet, kredit,
        keterangan, nik_input, tgl_exre, id_kantor, id_via_bayar,
        jenis, via_jurnal, id_trans, fdt, coa_buku, noresi, fins_trans_id
      ) VALUES (
        $1, $2, $2, $3, 0, $4,
        $5, 'SYSTEM_API', CURRENT_DATE, 1, 2,
        'e', $6, $7, NOW(), $3, $8, $9
      )`,
      [
        idJurnal, invoice_code, campaignCoa.coa_receipt, base_amount,
        `Penerimaan Donasi - ${invoice_code}`,
        viaJurnal, idTrans, invoice_code.slice(-8), finsTransId,
      ]
    );
  });

  // Step 6: Insert jurnal admin fee (jika admin_fee > 0)
  if (admin_fee > 0) {
    await context.run("insert-jurnal-admin-fee", async () => {
      // Debet ke akun bank (total_amount sudah masuk)
      // Kredit ke akun fee
      // Implementasi: fins_trans terpisah untuk admin_fee
      // ... (detail jurnal biaya admin)
    });
  }

  // Step 7: Update invoice.fins_trans_id dan campaign_budget_summary
  await context.run("update-invoice-fins-ref", async () => {
    await db.query(
      `UPDATE invoices SET fins_trans_id = $1 WHERE id = $2 AND created_at = $3`,
      [finsTransId, invoice_id, invoice_created_at]
    );
    await db.query(`
      INSERT INTO fins_campaign_budget_summary (campaign_id, target_amount, collected_amount, fins_jurnal_count, last_donation_at)
      VALUES ($1, (SELECT COALESCE(target_amount,0) FROM campaigns WHERE id=$1), $2, 1, NOW())
      ON CONFLICT (campaign_id) DO UPDATE SET
        collected_amount = fins_campaign_budget_summary.collected_amount + $2,
        fins_jurnal_count = fins_campaign_budget_summary.fins_jurnal_count + 1,
        last_donation_at = NOW(),
        last_synced_at = NOW()`,
      [campaign_id, base_amount]
    );
  });

  // Step 8: Log event SUCCESS ke fins_upstash_events
  await context.run("log-event-success", async () => {
    await db.query(`
      UPDATE fins_upstash_events SET status = 'SUCCESS', processed_at = NOW()
      WHERE entity_type = 'invoice' AND entity_id = $1 AND event_type = 'INVOICE_PAID'`,
      [invoice_id]
    );
  });
});
```

### Event Registration (saat webhook diterima)

```sql
INSERT INTO fins_upstash_events (
  event_type, entity_type, entity_id, entity_ref,
  payload, status, scheduled_at
) VALUES (
  'INVOICE_PAID',
  'invoice',
  :invoice_id,
  :invoice_code,
  :full_payload_json,
  'PENDING',
  NOW()
);
```

---

## Workflow 2 — `FINS_TRANS_UPDATE_JURNAL`: Perubahan Approve Status

**Trigger Asal MySQL:** `fins_trans_after_update`

**Kapan dijalankan:** Saat approve di fins_trans berubah dari `u`/`r` menjadi `a`/`as`/`aj`/`asj`/`ac`.

**Implementasi:** `PATCH /api/fins/trans/:id/approve`

### Kondisi Pembuatan Jurnal (dari MySQL trigger)

Jurnal dibuat/diupdate jika semua kondisi berikut terpenuhi:
- `mutasi != 'r'` (bukan rejection)
- `tgl_exre IS NOT NULL`
- `coa_debet != ''`
- `coa_kredit != ''`
- `approve IN ('a', 'as', 'aj', 'asj', 'ac')`

### Alur

```typescript
// lib/workflows/fins-trans-approve.ts
export const { POST } = serve<{
  fins_trans_id: number;
  old_approve: string;
  new_approve: string;
}>(async (context) => {
  const { fins_trans_id, old_approve, new_approve } = context.requestPayload;

  const APPROVED_STATES = ["a", "as", "aj", "asj", "ac"];
  const isNowApproved = APPROVED_STATES.includes(new_approve);
  const wasApproved = APPROVED_STATES.includes(old_approve);

  if (isNowApproved && !wasApproved) {
    // Buat jurnal baru (belum ada sebelumnya)
    await context.run("create-jurnal", async () => {
      const trans = await db.query(
        `SELECT * FROM fins_trans WHERE id = $1`, [fins_trans_id]
      );
      // ... buat entry debet & kredit di fins_jurnal
    });
  } else if (isNowApproved && wasApproved) {
    // Update jurnal yang sudah ada
    await context.run("update-jurnal", async () => {
      // UPDATE fins_jurnal WHERE fins_trans_id = :fins_trans_id
    });
  } else if (!isNowApproved && wasApproved) {
    // Hapus jurnal (transaksi di-reject/revert)
    await context.run("delete-jurnal", async () => {
      await db.query(
        `DELETE FROM fins_jurnal WHERE fins_trans_id = $1`, [fins_trans_id]
      );
    });
  }
});
```

---

## Workflow 3 — `FINS_TRANS_DELETE`: Hapus Transaksi & Jurnal

**Trigger Asal MySQL:** `fins_trans_after_delete`

**Catatan PostgreSQL:** Jurnal auto-terhapus via FK `fins_jurnal.fins_trans_id → fins_trans(id) ON DELETE CASCADE`.
Workflow ini untuk cleanup tambahan (campaign summary, event log).

```typescript
// lib/workflows/fins-trans-delete.ts
export const { POST } = serve<{
  fins_trans_id: number;
  campaign_id: number;
  base_amount: number;
}>(async (context) => {
  // Jurnal sudah terhapus via FK CASCADE
  // Perlu update fins_campaign_budget_summary
  await context.run("update-campaign-summary", async () => {
    await db.query(`
      UPDATE fins_campaign_budget_summary SET
        collected_amount = GREATEST(0, collected_amount - $1),
        fins_jurnal_count = GREATEST(0, fins_jurnal_count - 1),
        last_synced_at = NOW()
      WHERE campaign_id = $2`,
      [context.requestPayload.base_amount, context.requestPayload.campaign_id]
    );
  });
});
```

---

## Workflow 4 — `FINS_TRANS_VALIDATE`: Validasi Before Insert

**Trigger Asal MySQL:** `fins_trans_before_insert`

**Catatan PostgreSQL:** Sebagian logika sudah diganti constraint:
- `CHECK (nominal > 0)` — sudah di skema
- `CHECK (quantity >= 1)` — sudah di skema
- Generate `id_trans` — dilakukan di application layer sebelum INSERT

### Application Layer (lib/queries/fins-trans.ts)

```typescript
export async function createFinsTransInput(params: {
  nominal: number;
  quantity?: number;
  tgl_exre: Date;
  // ...
}): Promise<FinsTransInsert> {
  // Validasi
  if (params.nominal <= 0) throw new Error("Error: nominal tidak boleh kosong!");
  const quantity = Math.max(1, params.quantity ?? 1);

  // Generate id_trans: YYMMDDHHmmss + 6 random digits
  const now = params.tgl_exre;
  const ts = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0");
  const id_trans = ts + rand; // 18 chars

  return { ...params, quantity, id_trans };
}
```

---

## Workflow 5 — `FINS_JURNAL_ID_GENERATE`: Generate id_jurnal

**Trigger Asal MySQL:** `fins_jurnal_before_insert`

**Logika:** `id_jurnal = id_trans + '1'` (untuk debet) atau `id_trans + '2'` (untuk kredit)

### Application Layer (lib/queries/fins-jurnal.ts)

```typescript
export function generateJurnalId(idTrans: string, jenis: 'r' | 'e'): string {
  // r = penerimaan = debet side = '1'
  // e = pengeluaran = kredit side = '2'
  return idTrans + (jenis === 'r' ? '1' : '2');
}
```

---

## Cron 1 — `OPNAME_DAILY_CLOSE`: Penutupan Saldo Harian

**Trigger Asal MySQL:** `fins_opname_before_update` (sebagian)

**Jadwal Upstash QStash:** `0 23 * * *` (setiap hari pukul 23:00 WIB)

**Endpoint:** `POST /api/fins/cron/opname-daily`

### Logika

```typescript
// lib/cron/opname-daily.ts
export async function runDailyOpname() {
  const today = new Date().toISOString().split("T")[0];
  const activeCoas = await db.query(
    `SELECT DISTINCT coa FROM fins_jurnal WHERE tgl_exre = $1`, [today]
  );

  for (const { coa } of activeCoas) {
    // Hitung total debet & kredit hari ini per COA
    const result = await db.query(`
      SELECT
        COALESCE(SUM(debet), 0)  AS total_debet,
        COALESCE(SUM(kredit), 0) AS total_kredit
      FROM fins_jurnal
      WHERE coa = $1 AND tgl_exre = $2`,
      [coa, today]
    );

    // Ambil saldo kemarin
    const prev = await db.query(`
      SELECT saldo_akhir FROM fins_opname
      WHERE coa = $1 AND tanggal < $2 AND per = 'd'
      ORDER BY tanggal DESC LIMIT 1`,
      [coa, today]
    );

    const saldoAwal = prev?.saldo_akhir ?? 0;
    const saldoAkhir = saldoAwal + result.total_debet - result.total_kredit;

    await db.query(`
      INSERT INTO fins_opname (tanggal, coa, saldo_awal, debet, kredit, saldo_akhir, nik_input, id_kantor, per, via, updated)
      VALUES ($1, $2, $3, $4, $5, $6, 'SYSTEM_CRON', 1, 'd', 'coa', NOW())
      ON CONFLICT (tanggal, coa, id_kantor, per, via) DO UPDATE SET
        saldo_awal  = EXCLUDED.saldo_awal,
        debet       = EXCLUDED.debet,
        kredit      = EXCLUDED.kredit,
        saldo_akhir = EXCLUDED.saldo_akhir,
        updated     = NOW()`,
      [today, coa, saldoAwal, result.total_debet, result.total_kredit, saldoAkhir]
    );
  }
}
```

### QStash Schedule Registration

```typescript
// app/api/fins/cron/register/route.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

await qstash.schedules.create({
  destination: `${process.env.NEXT_PUBLIC_APP_URL}/api/fins/cron/opname-daily`,
  cron: "0 23 * * *",  // 23:00 setiap hari (UTC+7 = 16:00 UTC)
});
```

---

## Cron 2 — `OPNAME_MONTHLY_CLOSE`: Penutupan Saldo Bulanan

**Jadwal Upstash QStash:** `5 0 1 * *` (tanggal 1 setiap bulan pukul 00:05 WIB)

**Endpoint:** `POST /api/fins/cron/opname-monthly`

```typescript
// Agregasi saldo_akhir dari opname harian terakhir bulan lalu
// INSERT INTO fins_opname dengan per='m'
```

---

## Cron 3 — `OPNAME_YEARLY_CLOSE`: Penutupan Saldo Tahunan

**Jadwal Upstash QStash:** `10 0 1 1 *` (1 Januari setiap tahun pukul 00:10 WIB)

**Endpoint:** `POST /api/fins/cron/opname-yearly`

---

## Cron 4 — `JURNAL_THISYEAR_CLEANUP`: Arsip Jurnal Tahun Lalu

**Trigger Asal MySQL:** `fins_jurnal_after_insert` / `fins_jurnal_after_delete` (thisyear sync)

**Catatan:** Pola MySQL menggunakan table `fins_jurnal_thisyear` sebagai cache in-memory untuk jurnal tahun berjalan.
Di PostgreSQL dengan Neon, kita menggunakan **partial index** sebagai gantinya (jauh lebih efisien):

```sql
-- Index partial untuk jurnal tahun berjalan (dibuat ulang setiap tahun)
CREATE INDEX idx_fins_jurnal_thisyear
  ON fins_jurnal (tgl_exre DESC, coa, id_kantor)
  WHERE tgl_exre >= '2026-01-01';
```

**Jadwal:** `15 1 1 1 *` (1 Januari setiap tahun pukul 01:15 WIB)

**Endpoint:** `POST /api/fins/cron/jurnal-cleanup`

```typescript
export async function runJurnalYearlyCleanup() {
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  // 1. Drop dan recreate partial index untuk tahun baru
  await db.query(`
    DROP INDEX IF EXISTS idx_fins_jurnal_thisyear;
    CREATE INDEX idx_fins_jurnal_thisyear
      ON fins_jurnal (tgl_exre DESC, coa, id_kantor)
      WHERE tgl_exre >= '${currentYear}-01-01'::date;
  `);

  // 2. Log cleanup event
  await db.query(`
    INSERT INTO fins_upstash_events (event_type, entity_type, payload, status, processed_at)
    VALUES ('JURNAL_THISYEAR_CLEANUP', 'fins_jurnal',
      jsonb_build_object('year_cleaned', $1, 'new_year', $2), 'SUCCESS', NOW())`,
    [prevYear, currentYear]
  );
}
```

---

## Cron 5 — `UPSTASH_EVENT_RETRY`: Retry Failed Events

**Jadwal Upstash QStash:** `*/5 * * * *` (setiap 5 menit)

**Endpoint:** `POST /api/fins/cron/event-retry`

```typescript
export async function retryFailedEvents() {
  const failedEvents = await db.query(`
    SELECT * FROM fins_upstash_events
    WHERE status = 'RETRYING'
      AND retry_count < max_retries
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 10
  `);

  for (const event of failedEvents) {
    await db.query(
      `UPDATE fins_upstash_events SET status = 'PROCESSING', retry_count = retry_count + 1 WHERE id = $1`,
      [event.id]
    );
    // Re-trigger workflow berdasarkan event_type
    await triggerWorkflow(event);
  }
}
```

---

## Cron 6 — `CAMPAIGN_BUDGET_SYNC`: Sinkronisasi Budget Summary

**Jadwal Upstash QStash:** `0 1 * * *` (setiap hari pukul 01:00 WIB)

**Endpoint:** `POST /api/fins/cron/campaign-budget-sync`

```typescript
// Recalculate fins_campaign_budget_summary dari fins_jurnal aktual
// untuk memastikan konsistensi jika ada koreksi jurnal
export async function syncCampaignBudget() {
  await db.query(`
    INSERT INTO fins_campaign_budget_summary (
      campaign_id, target_amount, collected_amount, fins_jurnal_count, last_donation_at, last_synced_at
    )
    SELECT
      fcc.campaign_id,
      COALESCE(c.target_amount, 0),
      COALESCE(SUM(fj.kredit), 0)       AS collected_amount,
      COUNT(fj.id)                        AS fins_jurnal_count,
      MAX(fj.fdt)                         AS last_donation_at,
      NOW()
    FROM fins_campaign_coa fcc
    JOIN campaigns c ON c.id = fcc.campaign_id
    LEFT JOIN fins_jurnal fj ON fj.coa = fcc.coa_receipt AND fj.jenis = 'e'
    WHERE fcc.is_primary = true
    GROUP BY fcc.campaign_id, c.target_amount
    ON CONFLICT (campaign_id) DO UPDATE SET
      target_amount     = EXCLUDED.target_amount,
      collected_amount  = EXCLUDED.collected_amount,
      fins_jurnal_count = EXCLUDED.fins_jurnal_count,
      last_donation_at  = EXCLUDED.last_donation_at,
      last_synced_at    = EXCLUDED.last_synced_at
  `);
}
```

---

## Mapping Trigger `fins_trans.mutasi` → Upstash Workflow `via_jurnal`

Dari logika MySQL `fins_trans_after_insert`:

| `mutasi` | Makna | `via_jurnal` |
|---|---|---|
| `'2'` | Bank VA masuk | `1` |
| `'4'` | QRIS | `1` |
| `'e'` | E-wallet | `2` |
| `'1'` | Kas masuk | `3` |
| `'3'` | Transfer manual | `3` |
| `'6'` | Retail outlet | `3` |
| `'10'` | Lainnya | `3` |
| lainnya | Default | `0` |

```typescript
// lib/fins/via-jurnal.ts
export function getViaJurnal(mutasi: string): number {
  if (["2", "4"].includes(mutasi)) return 1;   // Bank / QRIS
  if (mutasi === "e") return 2;                 // E-wallet
  if (["1", "3", "6", "10"].includes(mutasi)) return 3; // Kas / Manual / Retail
  return 0;
}
```

---

## Upstash QStash Schedule Registry

```typescript
// scripts/register-cron-jobs.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

const cronJobs = [
  {
    name: "opname-daily",
    cron: "0 16 * * *",        // 23:00 WIB = 16:00 UTC
    url: `${BASE_URL}/api/fins/cron/opname-daily`,
  },
  {
    name: "opname-monthly",
    cron: "5 17 1 * *",         // tanggal 1 bulan, 00:05 WIB = 17:05 UTC hari sebelumnya
    url: `${BASE_URL}/api/fins/cron/opname-monthly`,
  },
  {
    name: "opname-yearly",
    cron: "10 17 1 1 *",        // 1 Jan
    url: `${BASE_URL}/api/fins/cron/opname-yearly`,
  },
  {
    name: "jurnal-cleanup",
    cron: "15 18 1 1 *",        // 1 Jan 01:15 WIB
    url: `${BASE_URL}/api/fins/cron/jurnal-cleanup`,
  },
  {
    name: "event-retry",
    cron: "*/5 * * * *",        // setiap 5 menit
    url: `${BASE_URL}/api/fins/cron/event-retry`,
  },
  {
    name: "campaign-budget-sync",
    cron: "0 18 * * *",         // 01:00 WIB = 18:00 UTC
    url: `${BASE_URL}/api/fins/cron/campaign-budget-sync`,
  },
];

for (const job of cronJobs) {
  await qstash.schedules.create({
    destination: job.url,
    cron: job.cron,
    headers: {
      "x-cron-secret": process.env.CRON_SECRET!,
    },
  });
  console.log(`✅ Registered: ${job.name} → ${job.cron}`);
}
```

---

## Perlindungan Endpoint Cron

```typescript
// middleware check untuk semua /api/fins/cron/*
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

export const POST = verifySignatureAppRouter(async (req) => {
  // handler logic
});
```

---

## Struktur Direktori Implementasi yang Direkomendasikan

```
app/
  api/
    fins/
      cron/
        opname-daily/route.ts
        opname-monthly/route.ts
        opname-yearly/route.ts
        jurnal-cleanup/route.ts
        event-retry/route.ts
        campaign-budget-sync/route.ts
    webhooks/
      xendit/route.ts          ← trigger Workflow 1 (INVOICE_PAID)
      midtrans/route.ts        ← trigger Workflow 1

lib/
  workflows/
    invoice-paid.ts            ← Workflow 1
    fins-trans-approve.ts      ← Workflow 2
    fins-trans-delete.ts       ← Workflow 3
  cron/
    opname-daily.ts
    opname-monthly.ts
    opname-yearly.ts
    jurnal-cleanup.ts
    event-retry.ts
    campaign-budget-sync.ts
  fins/
    via-jurnal.ts
    id-trans.ts
  queries/
    fins-trans.ts
    fins-jurnal.ts
    fins-opname.ts
scripts/
  register-cron-jobs.ts
```
