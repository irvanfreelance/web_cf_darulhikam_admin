# Product Requirements Document (PRD)
**Project:** Admin Panel - DonasiOnline SaaS
**Version:** 1.1.0
**Target Users:** NGO / Philanthropy Administrators

---

## 1. Product Vision
To provide a highly scalable, enterprise-grade administrative dashboard for NGOs. The system is designed to handle high traffic and complex philanthropic domains, managing everything from standard donations to Zakat, Qurban, bundled packages, and affiliate-driven fundraising, while offering deep analytics and marketing attribution.

## 2. Scope
This is a high-performance Next.js SPA acting as the control center for the DonasiOnline ecosystem. It handles complex data relationships, multi-channel payment integrations, and extensive logging for auditability.

## 3. Core Features

### 3.1. Main Dashboard & High-Traffic Analytics
* **Separated Stats Tracking:** Real-time KPI summary (Revenue, Donors, Views) utilizing asynchronous updates to prevent database locks during high-traffic events.
* **Data Visualization:** Trends and YTD achievements rendered via Recharts.

### 3.2. Advanced Campaign Management
* **Complex Campaign Types:** * Standard & Open Amount.
  * Zakat (with calculator).
  * Qurban (with specific variant pricing and mudhohi name tracking).
  * Bundling (combining multiple campaigns into one package, e.g., Fasting + Orphan Gifts).
* **QRIS Static for Offline Events:** Generation and management of static QRIS codes mapped directly to specific campaigns for offline fundraising.
* **Updates & Reporting:** Public timeline for transparent fund disbursement updates.

### 3.3. Affiliate & Fundraiser Ecosystem
* **Fundraiser Management:** Registration and tracking of individual affiliates.
* **Commission Engine:** Configurable commissions (Percentage or Flat Amount) per campaign for affiliates.
* **Withdrawals:** Management of affiliate balance payouts and bank account tracking.

### 3.4. Transaction & Donor Engine
* **Partitioned Transaction History:** Highly optimized transaction ledgers partitioned by month to handle massive datasets efficiently.
* **Donor Database:** Centralized donor profiling, including anonymous donation tracking.

### 3.5. Omnichannel Marketing & Ads Tracking
* **Server-to-Server (S2S) Conversions:** Native integrations with Meta CAPI, TikTok Events API, and Google Ads for accurate conversion tracking bypassing browser ad-blockers.
* **Extensive Logging:** Full audit trails for API requests (Payment Gateways, Notifications, Ads Conversions).

### 3.6. System Settings
* **Automated Notifications:** WhatsApp/Email templates triggered by specific events (Success, Pending).
* **Organization Config:** Visual identity, legal info, and global Pixel/CAPI tracking IDs.