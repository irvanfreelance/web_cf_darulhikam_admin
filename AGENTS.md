# System Architecture & Developer Agent Guidelines
**Target Agent:** AI Developer Assistant (Cursor, GitHub Copilot, etc.)
**Context:** Next.js Admin Panel - DonasiOnline (Partitioned Schema)

---

## 1. Project Paradigm
A monolithic Next.js application deployed on Vercel, utilizing a highly optimized, partitioned PostgreSQL database on Neon to handle high RPS (Requests Per Second).

## 2. STRICT Development Directives
* **No ORMs:** Write raw SQL strings for all backend logic. Never import Drizzle or Prisma into the application code.
* **Partition-Aware SQL:** Because `invoices` and `transactions` are partitioned by `created_at`, **any `UPDATE` or `DELETE` on these tables MUST include `created_at` in the `WHERE` clause.** * *Correct:* `UPDATE invoices SET status = $1 WHERE id = $2 AND created_at = $3`
  * *Incorrect:* `UPDATE invoices SET status = $1 WHERE id = $2`
* **Two-Step Writes:** When processing a successful donation, you must write the transaction AND update the separated `campaign_stats` table in a transaction block (`BEGIN` ... `COMMIT`).
* **Validation First:** Every API route MUST validate `req.body` or `req.query` using `Zod` before executing SQL.
* **Cache Invalidation:** Use Upstash Redis strictly for deleting keys (`redis.del()`) after `POST/PUT/DELETE` requests.
* **File Uploads:** Route via `@vercel/blob` SDK.
* **Charting:** Use `recharts` for all dashboard visualizations.

## 3. UI/UX Standards
* **Styling:** Tailwind CSS strictly (slate, teal, emerald, rose).
* **State Management:** Use `SWR` or `React Query` hooks to fetch data from the raw SQL Next.js API routes.