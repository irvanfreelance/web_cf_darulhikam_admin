# Technical Requirements Document (TRD)
**Project:** Admin Panel - DonasiOnline SaaS
**Architecture:** Next.js Full-Stack Serverless (High-Traffic Ready)

---

## 1. Infrastructure & Deployment (Rule 1)
* **Framework:** Next.js (App/Pages Router).
* **Deployment:** Vercel (Edge/Serverless functions).

## 2. Database & Partitioning Strategy (Rule 2)
* **Primary Database:** Neon Serverless Postgres.
* **Table Partitioning:** `invoices` and `transactions` tables are partitioned by RANGE (`created_at`). All queries targeting these tables MUST be partition-aware to maintain performance.

## 3. API & Data Access Strategy (Rule 3 & 4)
* **API Layer:** Next.js API Routes.
* **Raw SQL Mandate:** ALL database operations within the API routes MUST be written using **Raw SQL Queries** via `@neondatabase/serverless`. 
* **Drizzle Prohibition:** Drizzle is strictly limited to schema migrations (`npm run migrate`) and seeding (`npm run seed`). **No Drizzle ORM usage is allowed in the application logic.**
* **Stats Separation:** Write operations for counters (collected amount, donor count) must target `campaign_stats` or `affiliate_campaign_stats`, NEVER the main `campaigns` table directly.

## 4. Caching & Redis (Rule 5)
* **Provider:** Upstash Redis.
* **Allowed Operations:** Connect to Upstash Redis ONLY to execute `DEL` commands for cache invalidation when data mutations occur.

## 5. File Storage (Rule 6)
* **Provider:** Vercel Blob Storage.
* **Usage:** All file uploads (Campaign Banners, NGO Logos, update images).

## 6. Core Dependencies (Rule 7)
* `pdf`: Generating invoices and reports.
* `xlsx`: Exporting partitioned transaction data and donor lists.
* `zod`: Strict schema validation for all API payloads.
* `next-auth` (Stable): Authentication and RBAC (Superadmin, Finance).
* `recharts`: Dashboard visualizations.
* `dotenv`: Environment variable management for CLI scripts.
* `lucide-react`: UI iconography.