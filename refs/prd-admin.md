# Product Requirements Document — Admin CMS Portal
# LAZ Darul Hikam

**Version:** 2.0  
**Scope:** Internal CMS portal only (`/admin/*`). All public website specs → `prd-website.md`.  
**Companion docs:** `prd-website.md` · `erd.md` · `crowdfunding-portal.md`  
**Stack:** Next.js 15 App Router · TypeScript · Drizzle ORM · NextAuth.js v5 · Tailwind CSS v4  
**Design Reference:** `LAZAdminPanel.jsx` — React SPA artifact for UI/UX reference. Production uses SSR per-route, not a SPA.

---

## 1. Overview

The admin CMS portal lives at `/admin/*` and is fully protected by authentication and role-based access control (RBAC). It is the **single source of truth** for all dynamic content on the public website. Non-technical staff must be able to perform all routine content operations independently — no code deploys required.

**Every CMS write triggers on-demand ISR revalidation** of the relevant public routes. The portal is the bridge between internal staff and the live public website.

---

## 2. Architecture

```
Browser (admin user)
  → POST /admin/articles/[id]/edit (Server Action)
      → Validate session + role (middleware)
      → UPDATE web_articles SET ... (Drizzle ORM)
      → revalidatePath('/kabar-kebaikan')
      → revalidatePath('/kabar-kebaikan/' + slug)
      → revalidatePath('/')
      → INSERT web_cms_audit_log (user, action, entity, diff)
  → Toast: "Artikel dipublikasikan — ISR /kabar-kebaikan diperbarui"
```

**Admin routes:** All SSR, no caching. Every request hits the database.  
**Auth:** NextAuth.js v5 Credentials provider. Role stored in JWT. Middleware guards every `/admin/*` route.  
**File storage:** Cloudflare R2 via presigned URL — images and PDFs.

---

## 3. Authentication & Session

| Property | Value |
|---|---|
| Provider | Credentials (email + bcrypt password) |
| Session strategy | JWT (stateless) |
| Session timeout | 8 hours idle; auto re-login |
| Role in JWT | `role` claim; verified on every Server Action |
| Deactivation | Setting `is_active = false` invalidates all sessions immediately |
| Password minimum | 10 characters |
| Password storage | bcrypt hash, cost factor 12 |

---

## 4. Role Permission Matrix

| Resource | super_admin | content_editor | finance_staff | program_manager | cs_staff |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Articles (full CRUD) | ✓ | ✓ | — | — | — |
| Programs (all fields) | ✓ | ✓ | — | ✓ | — |
| Programs (`collected_amount` only) | ✓ | — | ✓ | — | — |
| Testimonials | ✓ | ✓ | — | — | — |
| Partners | ✓ | — | — | — | — |
| Financial Reports | ✓ | — | ✓ | — | — |
| Impact Metrics | ✓ | — | ✓ | — | — |
| Fund Allocations | ✓ | — | ✓ | — | — |
| Team Members | ✓ | — | — | — | — |
| Legal Documents | ✓ | — | — | — | — |
| Bank Accounts | ✓ | — | — | — | — |
| FAQ | ✓ | — | — | — | ✓ |
| Site Settings | ✓ | — | — | — | — |
| SEO & Metadata | ✓ | — | — | — | — |
| Admin Users | ✓ | — | — | — | — |
| Audit Log (read) | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 5. Navigation Structure

```
/admin
│
├── 📊  Dashboard                       /admin
│
├── 📝  Konten
│   ├── Artikel                         /admin/articles
│   │   ├── Semua Artikel               /admin/articles
│   │   ├── Artikel Baru                /admin/articles/new
│   │   ├── Edit Artikel                /admin/articles/[id]/edit
│   │   ├── Kategori                    /admin/articles/categories
│   │   └── Tags                        /admin/articles/tags
│   │
│   ├── Program                         /admin/programs
│   │   ├── Semua Program               /admin/programs
│   │   ├── Program Baru                /admin/programs/new
│   │   └── Edit Program                /admin/programs/[id]/edit
│   │
│   ├── Testimoni                       /admin/testimonials
│   └── Mitra                           /admin/partners
│
├── 📈  Transparansi
│   ├── Laporan Keuangan                /admin/reports
│   │   ├── Semua Laporan               /admin/reports
│   │   └── Upload Laporan              /admin/reports/upload
│   ├── Impact Metrics                  /admin/metrics
│   └── Alokasi Dana                    /admin/fund-allocations
│
├── 🏛️  Organisasi
│   ├── Tim & Pengurus                  /admin/team
│   ├── Dokumen Legalitas               /admin/legality
│   └── Rekening Resmi                  /admin/bank-accounts
│
├── 🙋  Layanan
│   └── FAQ                             /admin/faq
│
├── 🔧  Pengaturan
│   ├── Pengaturan Situs                /admin/settings/site
│   ├── SEO & Metadata                  /admin/settings/seo
│   └── Admin Users                     /admin/settings/users
│
└── 📋  Audit Log                       /admin/audit-log
```

---

## 6. Menu Specifications

### 6.1 Dashboard `/admin`

**Purpose:** At-a-glance health of the entire platform.

**KPI Cards (top row):**

| Widget | Source | Note |
|---|---|---|
| Program Aktif | `web_programs WHERE status=active` | Count |
| Artikel Published | `web_articles WHERE status=published` | Count |
| Mitra Aktif | `web_partners WHERE is_active=true` | Count |
| FAQ Nonaktif | `web_faqs WHERE is_active=false` | Needs review |

**Second row:**
- **Progress Penghimpunan** — horizontal bar chart per active program (collected vs target, %)
- **Aktivitas Terbaru** — last 10 rows from `web_cms_audit_log`: user avatar, action, entity, time-ago

**Quick Actions:** `+ Artikel Baru` · `+ Program Baru` · `↑ Update Metrics` · `↑ Upload Laporan`

**Revalidate ISR button** — triggers `revalidatePath()` for all public routes manually. Used after bulk edits.

---

### 6.2 Artikel `/admin/articles`

**Purpose:** Create and manage all news, field reports, and beneficiary stories for the *Kabar Kebaikan* section.

**List columns:** `Judul` · `Kategori` · `Status` · `Penulis` · `Dilihat` · `Featured` · `Tanggal` · `Aksi`  
**Filters:** Status · Kategori · Penulis · Tanggal · Is Featured  
**Search:** Full-text on `title` + `excerpt`  
**Bulk actions:** Publish · Archive · Soft-delete

**Editor Fields:**

| Field | Type | Constraint | Notes |
|---|---|---|---|
| Judul | Text | `VARCHAR(70)` required | Character counter shown; doubles as `<title>` tag |
| Judul Panjang | Text | `VARCHAR(300)` optional | Full headline for `<h1>` on article page |
| Slug | Text | Unique | Auto-generated; warning if changed post-publish |
| Excerpt | Textarea | `VARCHAR(160)` required | Character counter; doubles as `<meta description>` |
| Body | Tiptap editor | HTML | `<h2>`–`<h4>`, bold, italic, links, lists, blockquote, inline images (R2), YouTube embed (paste URL) |
| Kategori | Select | required | `field_report` / `program_update` / `beneficiary_story` / `announcement` / `education` |
| Program Terkait | Select | optional FK | Links article to a program |
| **Gambar Featured** | File upload | Max 2MB → WebP → R2 | **Separate from body.** Card thumbnail + `og:image` source |
| Featured Image Alt | Text | `VARCHAR(300)` | Required when image set; WCAG AA + Google image index |
| Featured Image Caption | Text | `VARCHAR(500)` | Optional; shown below hero on article page |
| Tags | Multi-select + creatable | | Creates new tag if not exists |
| Status | Toggle | | Draft → Published; sets `published_at = NOW()` |
| Is Featured | Toggle | | Homepage top-3 card slot |
| Estimasi Baca | Number (auto) | | `CEIL(word_count / 200)`; editable |
| **SEO Title** | Text | `VARCHAR(70)` | Override `<title>` / `og:title` / `twitter:title` |
| **SEO Description** | Textarea | `VARCHAR(160)` | Override `<meta description>` / `og:description` |
| **OG Image URL** | Text | | Override social share image if different from featured |
| **Canonical URL** | URL | | `<link rel="canonical">` — set when syndicated |
| **Robots** | Select | | `index,follow` (default) / `noindex,follow` / `noindex,nofollow` |
| **Twitter Card** | Select | | `summary_large_image` (default) / `summary` |
| **JSON-LD** | JSONB (auto) | | Auto-generated `NewsArticle` schema on publish; editable by super_admin |

**UX Notes:**
- Autosave draft every 60 seconds
- Preview at `/admin/articles/[id]/preview` — SSR, draft only visible to logged-in admin
- Slug regeneration warning if article already published
- Featured image in separate panel from Tiptap body
- YouTube embed: paste URL → auto-converted to responsive `<div class="video-embed"><iframe>` block
- Body images stored to R2 at `articles/{id}/body/`; featured to `articles/{id}/featured/`

**On Publish Server Action:**
```
revalidatePath('/kabar-kebaikan')
revalidatePath('/kabar-kebaikan/' + slug)
revalidatePath('/')
INSERT web_cms_audit_log (action='publish', entity_type='web_articles', ...)
```

---

### 6.3 Program `/admin/programs`

**Purpose:** Manage the five program pillars shown on /program and homepage.

**List columns:** `Thumbnail` · `Judul` · `Kategori` · `Progress %` · `Status` · `Featured` · `Urutan` · `Aksi`

| Field | Type | Notes |
|---|---|---|
| Judul | Text `VARCHAR(200)` | Required |
| Slug | Text | Auto-generated; URL-safe |
| Deskripsi Singkat | Textarea | Card copy; ≤200 chars |
| Deskripsi Penuh | Tiptap | Program detail page body |
| Kategori | Select | `education` / `health` / `disaster` / `economy` / `dakwah` |
| Status | Select | `active` / `completed` / `paused` / `archived` |
| Target Amount (Rp) | Number | Progress bar denominator |
| Collected Amount (Rp) | Number | `finance_staff`+ only; cannot exceed target |
| Thumbnail | File upload | Max 2MB → R2 |
| Is Featured | Toggle | Eligible for homepage top-3 (first 3 by `display_order`) |
| Urutan Tampil | Number | Drag-to-reorder UI |

**Business rules:**
- `collected_amount` ≤ `target_amount` (frontend validation + DB `CHECK`)
- Archiving immediately hides from all public pages (ISR invalidated)
- `program_manager` cannot edit `collected_amount` — finance staff only

**On Save:** `revalidatePath('/program')` + `revalidatePath('/')` + `revalidatePath('/transparansi')`

---

### 6.4 Testimoni `/admin/testimonials`

**Purpose:** Manage muzakki and mustahiq quotes in *Kisah Inspiratif* section (homepage shows top 3 active by `display_order`).

| Field | Type | Notes |
|---|---|---|
| Nama | Text | Required |
| Role / Lokasi | Text | e.g. "HR Manager, Bandung" |
| Tipe | Radio | `muzakki` (Donatur) / `mustahiq` (Penerima) |
| Inisial | Text 2–3 chars | Auto-derived from name; avatar fallback |
| Kutipan | Textarea | Required; italic blockquote on site |
| Foto Avatar | File upload | Optional; max 1MB; circular display |
| Program Terkait | Select | Optional FK |
| Aktif | Toggle | |
| Urutan | Number | Homepage shows first 3 active |

---

### 6.5 Mitra `/admin/partners`

**Purpose:** Manage institution names in the auto-scrolling marquee.

| Field | Type | Notes |
|---|---|---|
| Nama | Text | Required; shown in marquee chip |
| Logo | File upload | Optional; max 500KB; PNG/SVG preferred |
| Website URL | URL | Chip becomes clickable link |
| Tipe Mitra | Select | `corporate` / `government` / `ngo` / `academic` / `media` / `other` |
| Aktif | Toggle | Removes from marquee on next ISR revalidation |
| Urutan | Number | Marquee sequence |

---

### 6.6 Laporan Keuangan `/admin/reports`

**Purpose:** Upload and publish quarterly/annual financial reports as downloadable PDFs.

**List columns:** `Judul` · `Tipe` · `Status Audit` · `Ukuran` · `Unduhan` · `Publik` · `Aksi`

| Field | Type | Notes |
|---|---|---|
| Judul | Text | e.g. "Laporan Keuangan Tahunan 2024" |
| Tipe Laporan | Select | `annual` / `quarterly` / `monthly` / `special_audit` |
| Label Periode | Text | e.g. "Q2 2025" |
| Tahun | Number | 4-digit |
| Kuartal | Select | Q1–Q4; visible when type = quarterly |
| Status Audit | Select | `unaudited` / `internally_reviewed` / `kap_audited` |
| File PDF | Upload | Required; max 10MB → R2 |
| Publikasikan | Toggle | Controls public visibility on `/transparansi` |

**Access:** `finance_staff` + `super_admin` only.  
**On change:** `revalidatePath('/transparansi')`

---

### 6.7 Impact Metrics `/admin/metrics`

**Purpose:** Edit the 4 animated counter numbers shown in the *Angka yang Berbicara* section on `/` and `/transparansi`.

**Interface:** Inline editable table — no add/delete (rows are fixed; max 4 active).

| Field | Notes |
|---|---|
| Label | e.g. "Dana Tersalurkan (Rp)" |
| Nilai | Raw number, e.g. `47` |
| Sufiks | e.g. `M+`, `rb+`, `+` |
| Aktif | Show/hide this counter card |
| Urutan | Left-to-right card order |

**Access:** `finance_staff` + `super_admin`.  
**On save:** `revalidatePath('/')` + `revalidatePath('/transparansi')`  
**Frequency:** Monthly — updated after finance team publishes new report.

---

### 6.8 Alokasi Dana `/admin/fund-allocations`

**Purpose:** Record monthly fund disbursements per program — backs the financial transparency page.

**List view:** Grouped by year → month, showing per-program rows.

| Field | Notes |
|---|---|
| Program | FK to `web_programs` |
| Tahun | e.g. 2025 |
| Bulan | Januari–Desember |
| Dialokasikan (Rp) | Total budgeted this month |
| Disalurkan (Rp) | Actually sent out |
| Jumlah Penerima | Individuals reached |
| Catatan | Optional memo |

**Access:** `finance_staff` + `super_admin`.  
**On save:** `revalidatePath('/transparansi')`

---

### 6.9 Tim & Pengurus `/admin/team`

**Purpose:** Manage board of directors and key staff shown on `/tentang-kami`.

| Field | Notes |
|---|---|
| Nama | With credential suffix e.g. "S.E., M.M." |
| Jabatan | e.g. "Direktur Keuangan" |
| Departemen | |
| Inisial | 2–3 chars; avatar fallback |
| Warna Avatar | Hex color picker |
| Foto | Optional; max 1MB; circular |
| Bio | Short text |
| Aktif | Controls public display |
| Urutan | Left-to-right grid order |

**Access:** `super_admin` only.  
**On save:** `revalidatePath('/tentang-kami')`

---

### 6.10 Dokumen Legalitas `/admin/legality`

**Purpose:** Manage official licenses and permits shown on `/tentang-kami`.

| Field | Notes |
|---|---|
| Label | e.g. "SK Kemenag RI" |
| Nilai | e.g. "No. 792 Tahun 2020" |
| Diterbitkan Oleh | Issuing institution |
| Tanggal Terbit | Issue date |
| Tanggal Kedaluwarsa | Optional; triggers ⚠️ banner 60 days before expiry |
| File Dokumen | Optional PDF; max 5MB → R2 |
| Aktif | |

**Access:** `super_admin` only.  
**Expiry monitoring:** Dashboard shows warning badge when any document expires within 60 days.

---

### 6.11 Rekening Resmi `/admin/bank-accounts`

**Purpose:** Manage official donation bank accounts shown on `/layanan-ziswaf` and footer.

| Field | Notes |
|---|---|
| Nama Bank | Full name e.g. "Bank Syariah Indonesia (BSI)" |
| Nomor Rekening | Masked in list; full in edit form |
| Atas Nama | Must match official holder name exactly |
| Kode Bank | For future payment gateway routing |
| Logo Bank | Optional; max 200KB |
| Aktif | Instantly removes from all public pages |
| Urutan | |

**Access:** `super_admin` only.  
**Every edit requires password re-confirmation.**  
**On change:** `revalidatePath('/layanan-ziswaf')`

---

### 6.12 FAQ `/admin/faq`

**Purpose:** Manage FAQ accordion items on `/kontak`.

| Field | Notes |
|---|---|
| Pertanyaan | Max 300 chars |
| Jawaban | Rich text — bold, links, bullet lists |
| Kategori | `general` / `donation` / `zakat` / `program` / `partnership` / `technical` |
| Tampilkan | Toggle; controls accordion visibility |
| Urutan | Lower = shown first |

**Access:** `cs_staff` and above.  
**On save:** `revalidatePath('/kontak')`

---

### 6.13 Pengaturan Situs `/admin/settings/site`

**Purpose:** Global site config without a code deploy.

| Setting | Notes |
|---|---|
| Nama Situs | Used in browser tab and system emails |
| Tagline | Short institutional tagline |
| Email Kontak | Primary contact address |
| Nomor Telepon | Call center; shown in footer and `/kontak` |
| Nomor WhatsApp | CTA links on ZISWAF page |
| Alamat Kantor | Multi-line; shown on `/kontak` |
| Sosial: Instagram / Facebook / YouTube | URLs |
| Maintenance Mode | Toggle; shows maintenance page to all public visitors |

**Access:** `super_admin` only.  
**On save:** `revalidatePath('/')` + all public routes.

---

### 6.14 SEO & Metadata `/admin/settings/seo`

**Purpose:** Control site-wide default SEO tags.

| Setting | Notes |
|---|---|
| Template `<title>` | e.g. `%s — LAZ Darul Hikam` |
| Default Meta Description | Fallback for pages without custom description |
| Default OG Image | 1200×630; social share fallback across all pages |
| Google Analytics ID | `G-XXXXXXXXXX` |
| Google Search Console Verification | Meta tag token |
| Default Robots Directive | Site-wide fallback; per-article overrides this |

**Access:** `super_admin` only.

---

### 6.15 Admin Users `/admin/settings/users`

**Purpose:** Manage all CMS user accounts and roles.

**List columns:** `Nama` · `Email` · `Role` · `Login Terakhir` · `Aktif` · `Aksi`

| Field | Notes |
|---|---|
| Nama Lengkap | Required |
| Email | Unique login credential |
| Password | Min 10 chars; bcrypt; on edit shows "Reset Password" button |
| Role | `super_admin` / `content_editor` / `finance_staff` / `program_manager` / `cs_staff` |
| Avatar | Optional; shown in sidebar and audit log |
| Aktif | Deactivating immediately invalidates all sessions |

**Access:** `super_admin` only. Super admin account cannot be self-deleted.

---

### 6.16 Audit Log `/admin/audit-log`

**Purpose:** Immutable history of every CMS write action. Read-only for all roles.

**Columns:** `Waktu (WIB)` · `Pengguna` · `Aksi` · `Entitas` · `Tipe Tabel` · `IP Address`  
**Filters:** Rentang tanggal · Pengguna · Tipe aksi · Tipe entitas  
**Actions tracked:** `create` · `update` · `delete` · `publish` · `unpublish` · `restore`  
**Detail row:** Diff panel showing before/after JSON values for `update` actions.  
**Retention:** 12 months active in `web_cms_audit_log`; then cold storage export.

---

## 7. CMS Save → ISR Revalidation Map

Every Server Action calls `revalidatePath()` before returning. This table is the contract between CMS and public frontend.

| CMS Action | Routes Revalidated |
|---|---|
| Publish / update article | `/` · `/kabar-kebaikan` · `/kabar-kebaikan/[slug]` |
| Archive / delete article | `/` · `/kabar-kebaikan` |
| Update program (any field) | `/` · `/program` · `/program/[slug]` |
| Update `collected_amount` | `/` · `/program` · `/program/[slug]` · `/transparansi` |
| Update impact metrics | `/` · `/transparansi` |
| Upload / publish report | `/transparansi` |
| Update fund allocations | `/transparansi` |
| Add / remove partner | `/` · `/tentang-kami` |
| Update team member | `/tentang-kami` |
| Update legal document | `/tentang-kami` |
| Update bank account | `/layanan-ziswaf` |
| Update FAQ | `/kontak` |
| Update site settings | `/` + all public routes |

---

## 8. Operational Flows

### 8.1 Article Publish Flow

```
Content Editor
  → /admin/articles/new
  → Fills Title (≤70), Excerpt (≤160), Body (Tiptap HTML)
  → Uploads Featured Image (separate panel)
  → Assigns category, tags, optional program
  → Previews at /admin/articles/[id]/preview (SSR, admin-only)
  → Clicks "Publish"
  → Server Action: publishArticle(id)
      → UPDATE web_articles SET status='published', published_at=NOW()
      → revalidatePath('/kabar-kebaikan')
      → revalidatePath('/kabar-kebaikan/' + slug)
      → revalidatePath('/')
      → INSERT web_cms_audit_log
  → Toast: "Artikel dipublikasikan — ISR diperbarui"
  → Public site serves fresh HTML within seconds
```

### 8.2 Monthly Transparency Update Flow

```
Finance Staff (monthly, after closing)
  → /admin/metrics: update 4 counter values
      → revalidatePath('/') + revalidatePath('/transparansi')
  → /admin/fund-allocations: add disbursement records per program
      → revalidatePath('/transparansi')
  → /admin/reports: upload new quarterly PDF
      → Set audit_status, is_published = true
      → revalidatePath('/transparansi')
  → All actions logged in web_cms_audit_log with timestamp
```

### 8.3 Program Lifecycle Flow

```
Program Manager
  → /admin/programs/new → creates program (status: draft)
  → Content Editor reviews description + thumbnail
  → Super Admin or Program Manager sets status: active
  → Program appears on /program and /
  → Finance Staff updates collected_amount monthly
  → Progress bar on public site updates within 5 min ISR
  → When collected ≥ target → status: completed
  → Completed program archived (hidden from active listings)
```

---

## 9. UX Principles

1. **No-code operation** — all dynamic content editable by non-technical staff, no git/deploy required
2. **Preview before publish** — draft-preview URL accessible before going live
3. **Autosave** — article and program editors autosave drafts every 60 seconds
4. **Soft delete** — nothing permanently deleted; `deleted_at` state, restorable within 30 days
5. **Audit trail** — every write records user, timestamp, IP, and before/after diff
6. **Optimistic UI** — toggles (is_active, is_featured) update instantly with server confirmation in background
7. **Role clarity** — sidebar shows only items the current role can access; forbidden routes return 403
8. **Timezone** — all datetimes displayed in WIB (UTC+7) regardless of server timezone
9. **Revalidation feedback** — every CMS save shows a toast confirming which public routes were revalidated

---

## 10. Admin Folder Structure

```
src/app/admin/
├── layout.tsx                    # Auth guard + sidebar + topbar
├── page.tsx                      # Dashboard (SSR)
├── articles/
│   ├── page.tsx                  # List (SSR)
│   ├── new/page.tsx              # Create form
│   ├── [id]/
│   │   ├── edit/page.tsx         # Edit form (SSR)
│   │   └── preview/page.tsx      # Draft preview (SSR, admin-only)
│   ├── categories/page.tsx
│   └── tags/page.tsx
├── programs/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── testimonials/page.tsx
├── partners/page.tsx
├── reports/
│   ├── page.tsx
│   └── upload/page.tsx
├── metrics/page.tsx
├── fund-allocations/page.tsx
├── team/page.tsx
├── legality/page.tsx
├── bank-accounts/page.tsx
├── faq/page.tsx
├── audit-log/page.tsx
└── settings/
    ├── site/page.tsx
    ├── seo/page.tsx
    └── users/page.tsx

src/components/admin/
├── layout/
│   ├── AdminSidebar.tsx          # 'use client' — collapse, active state
│   └── AdminTopbar.tsx           # 'use client' — revalidate button
├── tables/
│   └── DataTable.tsx             # 'use client' — sort, filter, pagination
├── forms/
│   ├── ArticleForm.tsx           # 'use client' — Tiptap, file upload, SEO fields
│   ├── ProgramForm.tsx
│   └── FieldComponents.tsx       # Input, Select, Toggle, ColorPicker
└── editor/
    ├── TiptapEditor.tsx          # 'use client' — rich text editor
    └── ImageUploader.tsx         # 'use client' — R2 presigned upload

src/actions/                      # Next.js Server Actions
├── articles.ts                   # createArticle, updateArticle, publishArticle
├── programs.ts
├── metrics.ts
├── partners.ts
├── reports.ts
└── ...

src/middleware.ts                  # NextAuth session check for /admin/*
```

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Admin portal TTI | < 2.5s per page |
| Auth session | 8h idle timeout |
| File upload | PDF: 10MB · Image: 2MB · Logo: 500KB |
| File format | WebP converted on upload via `sharp` |
| TypeScript | Strict mode; no `any` |
| Audit log retention | 12 months active; quarterly cold archive |
| Concurrent admin users | 20 (SSR, no shared state issues) |
| Password hashing | bcrypt cost factor 12 |
| Bank account edits | Require password re-confirmation (2-step) |

---

## 12. Out of Scope

| Feature | Document |
|---|---|
| Public website routes, SEO, rendering | `prd-website.md` |
| Donation forms, payment gateway | `crowdfunding-portal.md` |
| Donation verification, donor history | `crowdfunding-portal.md` |
| Email receipts for donations | `crowdfunding-portal.md` |
| BAZNAS regulatory reporting API | `regulatory-integration.md` |
