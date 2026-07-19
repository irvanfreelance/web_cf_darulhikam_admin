-- -------------------------------------------------------------
-- TablePlus 6.9.1(670)
--
-- https://tableplus.com/
--
-- Database: neondb
-- Generation Time: 2026-05-09 22:06:04.9730
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."transaction_qurban_names_y2026m04";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS transaction_qurban_names_id_seq;

-- Table Definition
CREATE TABLE "public"."transaction_qurban_names_y2026m04" (
    "id" int8 NOT NULL DEFAULT nextval('transaction_qurban_names_id_seq'::regclass),
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamptz NOT NULL,
    "mudhohi_name" varchar(150) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."invoices_y2026m05";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS invoices_id_seq1;

-- Table Definition
CREATE TABLE "public"."invoices_y2026m05" (
    "id" int8 NOT NULL DEFAULT nextval('invoices_id_seq1'::regclass),
    "invoice_code" varchar(50) NOT NULL,
    "donor_id" int8,
    "payment_method_id" int8 NOT NULL,
    "donor_name_snapshot" varchar(150) NOT NULL,
    "donor_email" varchar(150),
    "donor_phone" varchar(20),
    "is_anonymous" bool DEFAULT false,
    "base_amount" int8 NOT NULL,
    "admin_fee" int8 DEFAULT 0,
    "total_amount" int8 NOT NULL,
    "unique_code" int4 DEFAULT 0,
    "fb_click_id" varchar(255),
    "fb_browser_id" varchar(255),
    "tiktok_click_id" varchar(255),
    "google_click_id" varchar(255),
    "client_ip_address" varchar(45),
    "client_user_agent" text,
    "status" varchar(20) DEFAULT 'PENDING'::character varying,
    "va_number" varchar(50),
    "payment_url" text,
    "qris_dynamic" text,
    "xendit_payment_request_id" varchar(255),
    "doa" text,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" timestamptz,
    "is_wa_checkout_sent" bool DEFAULT false,
    "is_wa_paid_sent" bool DEFAULT false,
    "is_email_checkout_sent" bool DEFAULT false,
    "is_email_paid_sent" bool DEFAULT false,
    "is_ads_sent" bool DEFAULT false,
    "proof_transfer" text,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."transactions_y2026m05";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq1;

-- Table Definition
CREATE TABLE "public"."transactions_y2026m05" (
    "id" int8 NOT NULL DEFAULT nextval('transactions_id_seq1'::regclass),
    "invoice_id" int8 NOT NULL,
    "invoice_created_at" timestamptz NOT NULL,
    "campaign_id" int8 NOT NULL,
    "bundle_campaign_id" int8,
    "variant_id" int8,
    "affiliate_id" int8,
    "qty" int2 DEFAULT 1,
    "amount" int8 NOT NULL,
    "affiliate_commission" int8 DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."ngo_configs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS ngo_configs_id_seq1;

-- Table Definition
CREATE TABLE "public"."ngo_configs" (
    "id" int8 NOT NULL DEFAULT nextval('ngo_configs_id_seq1'::regclass),
    "ngo_name" varchar(150) NOT NULL,
    "logo_url" varchar(255),
    "short_description" text,
    "address" text,
    "legal_info" text,
    "primary_color" varchar(20) DEFAULT '#1086b1'::character varying,
    "whatsapp_number" varchar(20),
    "instagram_url" varchar(255),
    "facebook_url" varchar(255),
    "favicon_url" varchar(255),
    "meta_pixel_id" varchar(50),
    "meta_capi_token" text,
    "google_ads_id" varchar(50),
    "google_developer_token" varchar(255),
    "google_analytic_id" varchar(50),
    "tiktok_pixel_id" varchar(50),
    "tiktok_events_api_token" text,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."admins";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS admins_id_seq1;

-- Table Definition
CREATE TABLE "public"."admins" (
    "id" int8 NOT NULL DEFAULT nextval('admins_id_seq1'::regclass),
    "name" varchar(100) NOT NULL,
    "email" varchar(150) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'SUPERADMIN'::character varying,
    "status" varchar(20) DEFAULT 'ACTIVE'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."categories";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS categories_id_seq1;

-- Table Definition
CREATE TABLE "public"."categories" (
    "id" int8 NOT NULL DEFAULT nextval('categories_id_seq1'::regclass),
    "name" varchar(100) NOT NULL,
    "color_theme" varchar(50),
    "is_active" bool DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."campaigns";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS campaigns_id_seq1;

-- Table Definition
CREATE TABLE "public"."campaigns" (
    "id" int8 NOT NULL DEFAULT nextval('campaigns_id_seq1'::regclass),
    "category_id" int8 NOT NULL,
    "title" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL,
    "image_url" varchar(255),
    "description" text,
    "is_verified" bool DEFAULT true,
    "is_urgent" bool DEFAULT false,
    "minimum_amount" int8 DEFAULT 10000,
    "suggestion_amounts" _int8 DEFAULT ARRAY[10000, 25000, 50000, 100000, 200000, 500000],
    "is_zakat" bool DEFAULT false,
    "is_qurban" bool DEFAULT false,
    "is_fixed_amount" bool DEFAULT false,
    "is_bundle" bool DEFAULT false,
    "has_no_target" bool DEFAULT false,
    "has_no_time_limit" bool DEFAULT false,
    "sort" int4 DEFAULT 0,
    "target_amount" int8,
    "end_date" timestamptz,
    "base_commission_pct" numeric(5,2) DEFAULT 0.00,
    "status" varchar(20) DEFAULT 'ACTIVE'::character varying,
    "is_carousel" bool DEFAULT false,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."campaign_qris_static";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS campaign_qris_static_id_seq1;

-- Table Definition
CREATE TABLE "public"."campaign_qris_static" (
    "id" int8 NOT NULL DEFAULT nextval('campaign_qris_static_id_seq1'::regclass),
    "campaign_id" int8 NOT NULL,
    "external_id" varchar(100) NOT NULL,
    "qris_string" text NOT NULL,
    "status" varchar(20) DEFAULT 'ACTIVE'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."campaign_bundles";
-- Table Definition
CREATE TABLE "public"."campaign_bundles" (
    "bundle_campaign_id" int8 NOT NULL,
    "item_campaign_id" int8 NOT NULL,
    "qty" int2 DEFAULT 1,
    PRIMARY KEY ("bundle_campaign_id","item_campaign_id")
);

DROP TABLE IF EXISTS "public"."campaign_variants";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS campaign_variants_id_seq1;

-- Table Definition
CREATE TABLE "public"."campaign_variants" (
    "id" int8 NOT NULL DEFAULT nextval('campaign_variants_id_seq1'::regclass),
    "campaign_id" int8 NOT NULL,
    "name" varchar(150) NOT NULL,
    "price" int8 NOT NULL,
    "names_per_qty" int2 DEFAULT 1,
    "stock_limit" int4,
    "is_active" bool DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."campaign_stats";
-- Table Definition
CREATE TABLE "public"."campaign_stats" (
    "campaign_id" int8 NOT NULL,
    "collected_amount" int8 DEFAULT 0,
    "donor_count" int4 DEFAULT 0,
    "package_sold" int4 DEFAULT 0,
    "views_count" int8 DEFAULT 0,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("campaign_id")
);

DROP TABLE IF EXISTS "public"."campaign_updates";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS campaign_updates_id_seq1;

-- Table Definition
CREATE TABLE "public"."campaign_updates" (
    "id" int8 NOT NULL DEFAULT nextval('campaign_updates_id_seq1'::regclass),
    "campaign_id" int8 NOT NULL,
    "title" varchar(255) NOT NULL,
    "excerpt" text,
    "content" text,
    "image_url" varchar(255),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."affiliates";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS affiliates_id_seq1;

-- Table Definition
CREATE TABLE "public"."affiliates" (
    "id" int8 NOT NULL DEFAULT nextval('affiliates_id_seq1'::regclass),
    "affiliate_code" varchar(20) NOT NULL,
    "name" varchar(100) NOT NULL,
    "email" varchar(150) NOT NULL,
    "phone" varchar(20),
    "password_hash" varchar(255) NOT NULL,
    "balance" int8 DEFAULT 0,
    "status" varchar(20) DEFAULT 'ACTIVE'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."affiliate_commissions";
-- Table Definition
CREATE TABLE "public"."affiliate_commissions" (
    "affiliate_id" int8 NOT NULL,
    "campaign_id" int8 NOT NULL,
    "commission_type" varchar(20) DEFAULT 'PERCENTAGE'::character varying,
    "commission_value" numeric(10,2) NOT NULL,
    PRIMARY KEY ("affiliate_id","campaign_id")
);

DROP TABLE IF EXISTS "public"."affiliate_campaign_stats";
-- Table Definition
CREATE TABLE "public"."affiliate_campaign_stats" (
    "affiliate_id" int8 NOT NULL,
    "campaign_id" int8 NOT NULL,
    "click_count" int4 DEFAULT 0,
    "converted_donors" int4 DEFAULT 0,
    "raised_amount" int8 DEFAULT 0,
    "commission_earned" int8 DEFAULT 0,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("affiliate_id","campaign_id")
);

DROP TABLE IF EXISTS "public"."withdrawals";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS withdrawals_id_seq1;

-- Table Definition
CREATE TABLE "public"."withdrawals" (
    "id" int8 NOT NULL DEFAULT nextval('withdrawals_id_seq1'::regclass),
    "affiliate_id" int8 NOT NULL,
    "amount" int8 NOT NULL,
    "bank_account_info" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'PENDING'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "processed_at" timestamptz,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."payment_methods";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS payment_methods_id_seq1;

-- Table Definition
CREATE TABLE "public"."payment_methods" (
    "id" int8 NOT NULL DEFAULT nextval('payment_methods_id_seq1'::regclass),
    "code" varchar(50) NOT NULL,
    "name" varchar(100) NOT NULL,
    "logo_url" varchar(255),
    "type" varchar(50) NOT NULL,
    "provider" varchar(50) NOT NULL,
    "admin_fee_flat" int8 DEFAULT 0,
    "admin_fee_pct" numeric(5,2) DEFAULT 0.00,
    "is_active" bool DEFAULT true,
    "is_redirect" bool DEFAULT false,
    "sort_order" int4 DEFAULT 0,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."payment_instructions";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS payment_instructions_id_seq1;

-- Table Definition
CREATE TABLE "public"."payment_instructions" (
    "id" int8 NOT NULL DEFAULT nextval('payment_instructions_id_seq1'::regclass),
    "payment_method_id" int8 NOT NULL,
    "title" varchar(255) NOT NULL,
    "content" text NOT NULL,
    "sort_order" int4 DEFAULT 0,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."donors";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS donors_id_seq1;

-- Table Definition
CREATE TABLE "public"."donors" (
    "id" int8 NOT NULL DEFAULT nextval('donors_id_seq1'::regclass),
    "name" varchar(150) NOT NULL,
    "email" varchar(150),
    "phone" varchar(20),
    "is_anonymous_default" bool DEFAULT false,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."invoices";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS invoices_id_seq1;

-- Table Definition
CREATE TABLE "public"."invoices" (
    "id" int8 NOT NULL DEFAULT nextval('invoices_id_seq1'::regclass),
    "invoice_code" varchar(50) NOT NULL,
    "donor_id" int8,
    "payment_method_id" int8 NOT NULL,
    "donor_name_snapshot" varchar(150) NOT NULL,
    "donor_email" varchar(150),
    "donor_phone" varchar(20),
    "is_anonymous" bool DEFAULT false,
    "base_amount" int8 NOT NULL,
    "admin_fee" int8 DEFAULT 0,
    "total_amount" int8 NOT NULL,
    "unique_code" int4 DEFAULT 0,
    "fb_click_id" varchar(255),
    "fb_browser_id" varchar(255),
    "tiktok_click_id" varchar(255),
    "google_click_id" varchar(255),
    "client_ip_address" varchar(45),
    "client_user_agent" text,
    "status" varchar(20) DEFAULT 'PENDING'::character varying,
    "va_number" varchar(50),
    "payment_url" text,
    "qris_dynamic" text,
    "xendit_payment_request_id" varchar(255),
    "doa" text,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" timestamptz,
    "is_wa_checkout_sent" bool DEFAULT false,
    "is_wa_paid_sent" bool DEFAULT false,
    "is_email_checkout_sent" bool DEFAULT false,
    "is_email_paid_sent" bool DEFAULT false,
    "is_ads_sent" bool DEFAULT false,
    "proof_transfer" text,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."invoices_y2026m10";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS invoices_id_seq1;

-- Table Definition
CREATE TABLE "public"."invoices_y2026m10" (
    "id" int8 NOT NULL DEFAULT nextval('invoices_id_seq1'::regclass),
    "invoice_code" varchar(50) NOT NULL,
    "donor_id" int8,
    "payment_method_id" int8 NOT NULL,
    "donor_name_snapshot" varchar(150) NOT NULL,
    "donor_email" varchar(150),
    "donor_phone" varchar(20),
    "is_anonymous" bool DEFAULT false,
    "base_amount" int8 NOT NULL,
    "admin_fee" int8 DEFAULT 0,
    "total_amount" int8 NOT NULL,
    "unique_code" int4 DEFAULT 0,
    "fb_click_id" varchar(255),
    "fb_browser_id" varchar(255),
    "tiktok_click_id" varchar(255),
    "google_click_id" varchar(255),
    "client_ip_address" varchar(45),
    "client_user_agent" text,
    "status" varchar(20) DEFAULT 'PENDING'::character varying,
    "va_number" varchar(50),
    "payment_url" text,
    "qris_dynamic" text,
    "xendit_payment_request_id" varchar(255),
    "doa" text,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" timestamptz,
    "is_wa_checkout_sent" bool DEFAULT false,
    "is_wa_paid_sent" bool DEFAULT false,
    "is_email_checkout_sent" bool DEFAULT false,
    "is_email_paid_sent" bool DEFAULT false,
    "is_ads_sent" bool DEFAULT false,
    "proof_transfer" text,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."transactions";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq1;

-- Table Definition
CREATE TABLE "public"."transactions" (
    "id" int8 NOT NULL DEFAULT nextval('transactions_id_seq1'::regclass),
    "invoice_id" int8 NOT NULL,
    "invoice_created_at" timestamptz NOT NULL,
    "campaign_id" int8 NOT NULL,
    "bundle_campaign_id" int8,
    "variant_id" int8,
    "affiliate_id" int8,
    "qty" int2 DEFAULT 1,
    "amount" int8 NOT NULL,
    "affiliate_commission" int8 DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."transactions_y2026m10";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq1;

-- Table Definition
CREATE TABLE "public"."transactions_y2026m10" (
    "id" int8 NOT NULL DEFAULT nextval('transactions_id_seq1'::regclass),
    "invoice_id" int8 NOT NULL,
    "invoice_created_at" timestamptz NOT NULL,
    "campaign_id" int8 NOT NULL,
    "bundle_campaign_id" int8,
    "variant_id" int8,
    "affiliate_id" int8,
    "qty" int2 DEFAULT 1,
    "amount" int8 NOT NULL,
    "affiliate_commission" int8 DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."transaction_qurban_names_y2026m05";
-- Table Definition
CREATE TABLE "public"."transaction_qurban_names_y2026m05" (
    "id" int8 NOT NULL,
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamptz NOT NULL,
    "mudhohi_name" varchar(150) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."transaction_qurban_names";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS transaction_qurban_names_id_seq1;

-- Table Definition
CREATE TABLE "public"."transaction_qurban_names" (
    "id" int8 NOT NULL DEFAULT nextval('transaction_qurban_names_id_seq1'::regclass),
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamptz NOT NULL,
    "mudhohi_name" varchar(150) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."payment_logs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS payment_logs_id_seq1;

-- Table Definition
CREATE TABLE "public"."payment_logs" (
    "id" int8 NOT NULL DEFAULT nextval('payment_logs_id_seq1'::regclass),
    "invoice_code" varchar(50) NOT NULL,
    "endpoint" varchar(255),
    "type" varchar(50),
    "request_payload" text,
    "response_payload" text,
    "http_status" int4,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."notification_templates";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS notification_templates_id_seq1;

-- Table Definition
CREATE TABLE "public"."notification_templates" (
    "id" int8 NOT NULL DEFAULT nextval('notification_templates_id_seq1'::regclass),
    "event_trigger" varchar(50) NOT NULL,
    "channel" varchar(20) NOT NULL,
    "message_content" text NOT NULL,
    "is_active" bool DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."notification_logs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS notification_logs_id_seq1;

-- Table Definition
CREATE TABLE "public"."notification_logs" (
    "id" int8 NOT NULL DEFAULT nextval('notification_logs_id_seq1'::regclass),
    "template_id" int8,
    "invoice_code" varchar(50),
    "recipient" varchar(150) NOT NULL,
    "channel" varchar(20) NOT NULL,
    "request_payload" text,
    "response_payload" text,
    "status" varchar(20),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."ads_conversion_logs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS ads_conversion_logs_id_seq1;

-- Table Definition
CREATE TABLE "public"."ads_conversion_logs" (
    "id" int8 NOT NULL DEFAULT nextval('ads_conversion_logs_id_seq1'::regclass),
    "invoice_code" varchar(50) NOT NULL,
    "platform" varchar(50) NOT NULL,
    "event_name" varchar(100) NOT NULL,
    "request_payload" text,
    "response_payload" text,
    "http_status" int4,
    "status" varchar(20),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."invoices_y2026m05" ("id", "invoice_code", "donor_id", "payment_method_id", "donor_name_snapshot", "donor_email", "donor_phone", "is_anonymous", "base_amount", "admin_fee", "total_amount", "unique_code", "fb_click_id", "fb_browser_id", "tiktok_click_id", "google_click_id", "client_ip_address", "client_user_agent", "status", "va_number", "payment_url", "qris_dynamic", "xendit_payment_request_id", "doa", "created_at", "paid_at", "is_wa_checkout_sent", "is_wa_paid_sent", "is_email_checkout_sent", "is_email_paid_sent", "is_ads_sent") VALUES
(1, 'INV-20260501-1BFEEF', 4, 5, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 'f', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', NULL, '{"qr_string":"some-random-qr-string","type":"qr_code"}', NULL, 'pr-c9784c16-d254-481b-9a3f-a9120d98ece6', 'tes', '2026-05-01 03:44:06.827+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(2, 'INV-20260501-3453CD', 4, 4, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 'f', 100000, 4000, 104000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '934799996103874', NULL, NULL, 'pr-16da46d2-8c5a-4c02-a6fe-81033886df1f', 'tes', '2026-05-01 03:47:16.658+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(3, 'INV-20260501-C753AB', 4, 12, 'irvan', 'irvan.freelance@gmail.com', '081462206437', 'f', 200000, 4000, 204000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '901000109999589084', NULL, NULL, 'pr-50783d0c-acc4-48de-8b3c-5232ffdb18dd', NULL, '2026-05-01 04:04:49.074+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(4, 'INV-20260501-F056DE', 5, 7, 'eva', 'irvanadrian151@gmail.com', '089613727205', 't', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-service-dev.xendit.co/ewallets/sandbox/checkout?token=9315b8dff1c359267b0a767b8c474ba8ef04e237090abd146c2c12ba7e722db791d8d990ae3059995b22410d5e23a5b2a1587877b94a1d5ba8b8f836fcac68ed6fb6b1bb8361f894bafcb44d2993312826390c1dfd6ca01df42ac3b3a3be1dd75faa1c1121a1535d29a1e05120163ed4a5db21fa0e266bb8a031c071cef09ba6c4f67d62b6d4dd83897939124b155ad3dfd9a4e7680abc7131497c0132d2d5e911f1cdea952299b2b809bd85fb79e0997e0afba868ba87c2437aa99c8e5591f57a3c1ff64feec4158c4a138869dbffd0ff96c93088446e86daf7920de0047b79f0a6ef17ece84e20275ac4256e617ea5918f73b99f31acb0c138abe110859feb53eee4037c6c09ab6265498e4865cc5b69546b465e321217af6f', NULL, 'pr-1b935719-0ab1-4a23-adb7-09f1a5310b93', NULL, '2026-05-01 07:09:26.8+00', '2026-05-01 07:09:35.864107+00', 'f', 'f', 'f', 'f', 'f'),
(5, 'INV-20260501-325C38', 5, 6, 'eva', 'irvanadrian151@gmail.com', '089613727205', 'f', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7q55jg72snc73chp7jg', NULL, 'pr-d48c4796-e254-4716-9fa6-a8d4ff4c303b', NULL, '2026-05-01 07:14:21.137+00', '2026-05-01 07:36:01.946707+00', 'f', 'f', 'f', 'f', 'f'),
(6, 'INV-20260502-D396FD', 4, 6, 'irvan', 'irvan@cnt.id', '6281462206437', 'f', 50000, 0, 50000, 0, NULL, NULL, NULL, NULL, '103.175.49.97', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qlm1g72snc73chpikg', NULL, 'pr-d9eed294-3130-4d3d-9312-cb76663821d1', NULL, '2026-05-02 02:01:41.339+00', '2026-05-02 02:01:50.825337+00', 'f', 'f', 'f', 'f', 'f'),
(7, 'INV-20260502-49B97B', 4, 6, 'irvan', 'irvan@cnt.id', '6281462206437', 'f', 2500000, 0, 2500000, 0, NULL, NULL, NULL, NULL, '103.175.49.97', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qln7072snc73chpil0', NULL, 'pr-e31d41b8-2bf6-49b2-ae53-9d5632e58508', 'tes', '2026-05-02 02:04:11.396+00', '2026-05-02 02:04:19.473501+00', 'f', 'f', 'f', 'f', 'f'),
(8, 'INV-20260502-A609B2', 4, 6, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 't', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qv6b7bir0s73dngsmg', NULL, 'pr-7b4a6f73-9661-4d23-a0d8-5d116e0af0c5', 'semangat', '2026-05-02 12:50:51.255+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(9, 'INV-20260503-AEC827', 4, 4, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 50000, 4000, 54000, 0, NULL, NULL, NULL, NULL, '114.122.78.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '934799992134542', NULL, NULL, 'pr-1d39e37c-0656-4b62-bca6-9b53809fc017', NULL, '2026-05-03 03:31:47.392+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(10, 'INV-20260503-7127D7', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '114.122.78.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7rc4k7bir0s73dnh4og', NULL, 'pr-0dc968b3-060e-40f4-9cfd-7f30af7e224a', NULL, '2026-05-03 03:34:39.521+00', '2026-05-03 03:34:48.902342+00', 'f', 'f', 'f', 'f', 'f'),
(11, 'INV-20260509-2E9F8C', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 35000, 0, 35000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk51qbq21c73amtqh0', NULL, 'pr-0d7fb8c4-37fb-40b7-8fbe-535bc3ed1933', NULL, '2026-05-09 14:19:50.708+00', '2026-05-09 14:19:58.69041+00', 'f', 'f', 'f', 'f', 'f'),
(12, 'INV-20260509-EE4C25', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk5r2bq21c73amtqi0', NULL, 'pr-b03ed15d-b12e-408c-afac-1fdb6b5080f6', NULL, '2026-05-09 14:21:31.158+00', '2026-05-09 14:21:40.231356+00', 'f', 'f', 'f', 'f', 'f'),
(13, 'INV-20260509-3D5FA8', 4, 6, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 't', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk8v2bq21c73amtql0', NULL, 'pr-04c8a6a9-14b6-4eaa-ba1b-655ae2ba88be', 'semangat', '2026-05-09 14:28:12.186+00', NULL, 'f', 'f', 'f', 'f', 'f');

INSERT INTO "public"."transactions_y2026m05" ("id", "invoice_id", "invoice_created_at", "campaign_id", "bundle_campaign_id", "variant_id", "affiliate_id", "qty", "amount", "affiliate_commission", "created_at") VALUES
(1, 1, '2026-05-01 03:44:06.827+00', 2, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 03:44:06.827+00'),
(2, 2, '2026-05-01 03:47:16.658+00', 9, NULL, NULL, NULL, 1, 100000, 0, '2026-05-01 03:47:16.658+00'),
(3, 3, '2026-05-01 04:04:49.074+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 04:04:49.074+00'),
(4, 4, '2026-05-01 07:09:26.8+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 07:09:26.8+00'),
(5, 5, '2026-05-01 07:14:21.137+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 07:14:21.137+00'),
(6, 6, '2026-05-02 02:01:41.339+00', 3, NULL, NULL, NULL, 1, 50000, 0, '2026-05-02 02:01:41.339+00'),
(7, 7, '2026-05-02 02:04:11.396+00', 6, NULL, NULL, NULL, 1, 2500000, 0, '2026-05-02 02:04:11.396+00'),
(8, 8, '2026-05-02 12:50:51.255+00', 1, NULL, NULL, NULL, 1, 500000, 0, '2026-05-02 12:50:51.255+00'),
(9, 9, '2026-05-03 03:31:47.392+00', 2, NULL, NULL, NULL, 1, 50000, 0, '2026-05-03 03:31:47.392+00'),
(10, 10, '2026-05-03 03:34:39.521+00', 1, NULL, NULL, NULL, 1, 500000, 0, '2026-05-03 03:34:39.521+00'),
(11, 11, '2026-05-09 14:19:50.708+00', 4, NULL, NULL, 2, 1, 35000, 0, '2026-05-09 14:19:50.708+00'),
(12, 12, '2026-05-09 14:21:31.158+00', 1, NULL, NULL, 2, 1, 500000, 0, '2026-05-09 14:21:31.158+00'),
(13, 13, '2026-05-09 14:28:12.186+00', 1, NULL, NULL, 2, 1, 500000, 0, '2026-05-09 14:28:12.186+00');

INSERT INTO "public"."ngo_configs" ("id", "ngo_name", "logo_url", "short_description", "address", "legal_info", "primary_color", "whatsapp_number", "instagram_url", "facebook_url", "favicon_url", "meta_pixel_id", "meta_capi_token", "google_ads_id", "google_developer_token", "google_analytic_id", "tiktok_pixel_id", "tiktok_events_api_token", "updated_at") VALUES
(1, 'SHAF Foundation', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/Screen%20Shot%202026-05-01%20at%2010.17.28-U4RfPQSXwYHfQ5XzwomlomXC77kVUS.png', 'Lembaga filantropi independen yang berdedikasi untuk menyalurkan kebaikan donatur secara transparan, profesional, dan tepat sasaran.', 'Jl. Kebaikan Bangsa No. 99, Gedung Amal Lt. 2, Jakarta Selatan, DKI Jakarta 12345', 'Resmi terdaftar dengan SK Kemenkumham RI No. AHU-00123.AH.01.04.Tahun 2026', '#1086b1', '6281234567890', '', '', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/Screen%20Shot%202026-05-01%20at%2010.17.40-Q5Ri24GBBDf7QCv7LJyNBBD5hGPFtX.png', '123456789012345', '', '', '', '', 'CD12345TIKTOKPIXEL', '', '2026-05-01 03:37:17.458121+00');

INSERT INTO "public"."admins" ("id", "name", "email", "password_hash", "role", "status", "created_at") VALUES
(1, 'Ahmad Fulan', 'ahmad@ngo.org', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(2, 'Rina Keuangan', 'rina@ngo.org', '$2a$12$Dummy', 'FINANCE', 'ACTIVE', '2026-04-19 01:39:51.048594+00');

INSERT INTO "public"."categories" ("id", "name", "color_theme", "is_active") VALUES
(1, 'Medis', 'rose', 't'),
(2, 'Pendidikan', 'blue', 't'),
(3, 'Bencana', 'orange', 't'),
(4, 'Panti Asuhan', 'teal', 't'),
(5, 'Zakat', 'emerald', 't'),
(6, 'Qurban', 'amber', 't'),
(7, 'Infaq', 'indigo', 't'),
(8, 'Pembangunan', 'slate', 'f');

INSERT INTO "public"."campaigns" ("id", "category_id", "title", "slug", "image_url", "description", "is_verified", "is_urgent", "minimum_amount", "suggestion_amounts", "is_zakat", "is_qurban", "is_fixed_amount", "is_bundle", "has_no_target", "has_no_time_limit", "sort", "target_amount", "end_date", "base_commission_pct", "status", "created_at", "updated_at") VALUES
(1, 1, 'Suami Telah Tiada, Bantu Bu Dede Berjuang Sembuh', 'tolongindedesembuh', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/12d85e7c-c5d0-429c-ae38-bfdf3d300adb%20%281%29-XoyA6gy8CIkolLrThLDBmFTJ0yEB17.jpg', '<p>Nama saya Dede Hartati, usia saya 57 tahun. Sejak lama saya hanya seorang ibu rumah tangga dan kini hidup sebagai janda, bergantung pada anak saya yang bekerja serabutan.</p><p>Beberapa waktu lalu, saya terjatuh di rumah dan mengalami patah tulang paha. Rasa sakitnya sangat luar biasa, bahkan saya harus menahannya berhari-hari sebelum akhirnya bisa menjalani operasi.</p><p>Saat ini saya masih dalam masa pemulihan, namun kondisi saya belum sepenuhnya membaik. Saya masih merasakan nyeri, lemas akibat anemia, dan belum bisa berjalan seperti sebelumnya.</p><p>Saya ingin sembuh… saya ingin kembali beraktivitas tanpa membebani anak saya yang sudah berjuang sendiri memenuhi kebutuhan kami.</p><p>Namun kondisi ekonomi kami sangat terbatas, sementara biaya pengobatan dan perawatan masih terus berjalan.</p><p>Melalui bantuan Bapak/Ibu/Saudara/i, saya memohon dukungan agar saya bisa menjalani pengobatan hingga pulih.</p><p>Bagi saya, bantuan Anda adalah harapan untuk bisa kembali berdiri dan menjalani hidup dengan lebih baik.</p>', 't', 't', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 'f', 'f', 'f', 'f', 0, 150000000, '2026-10-24 00:00:00+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-07 04:19:44.093282+00'),
(2, 2, 'Bantu Panti Yatim Terdampak Bencana Aceh Sumatra', 'ashumpantiasuhan', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/0377452a-42bc-11f1-9a51-ae2e0aa661cc_FA28D4E899F93364-ZB3Ezx78T7D7k2nZbH7xBfzRcYnh5O.jpg', '<p>Di tengah derasnya banjir yang melanda beberapa wilayah di Sumatera Utara, ribuan kisah kehilangan tersisa. Rumah-rumah hanyut, harta benda tak terselamatkan, dan akses terhadap kebutuhan dasar menjadi semakin sulit.</p><p><br></p><p>Di antara semua itu, ada duka yang begitu dalam dirasakan oleh anak-anak di panti asuhan mereka yang sejak awal telah hidup dalam keterbatasan, kini harus kembali diuji oleh keadaan.</p><img src="https://imgix.kitabisa.com/a56bd57f-42bc-11f1-9a51-ae2e0aa661cc_B3AFF99C3B847695.jpg?auto=compress,format&amp;cs=tinysrgb&amp;fm=pjpg?auto=compress,format&amp;cs=tinysrgb&amp;fm=pjpg" alt="a56bd57f-42bc-11f1-9a51-ae2e0aa661cc_B3AFF99C3B847695.jpg" width="480" height="100%"><p><br><br></p><p>Panti asuhan yang selama ini menjadi tempat mereka berlindung, kini ikut terdampak. Bangunan rusak, ruang-ruang tak lagi nyaman, dan berbagai kebutuhan dasar ikut hilang. Tempat tidur, bantal, guling, selimut, hingga pakaian yang mereka miliki tak luput dari terjangan banjir.</p><p><br></p><p>Dalam situasi yang begitu mendesak, mereka hanya mampu menyelamatkan diri dengan pakaian yang masih melekat di tubuh mereka.</p><img src="https://imgix.kitabisa.com/6135e90f-42bc-11f1-9a51-ae2e0aa661cc_D02B7EE402ABD936.jpg?auto=compress,format&amp;cs=tinysrgb&amp;fm=pjpg" alt="6135e90f-42bc-11f1-9a51-ae2e0aa661cc_D02B7EE402ABD936.jpg" width="480" height="100%"><p><br></p><p>Melalui halaman galang dana ini, ASAR Humanity mengajak #orangbaik untuk hadir sebagai bagian dari harapan mereka. Bantuan yang diberikan akan digunakan untuk memperbaiki fasilitas panti, menyediakan kebutuhan dasar seperti tempat tidur, perlengkapan tidur, pakaian, serta kebutuhan harian dan kebutuhan mendesak lainnya.</p>', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 'f', 'f', 'f', 'f', 1, 300000000, '2026-11-26 00:00:00+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-07 09:14:04.705099+00'),
(3, 3, 'Bantuan Pangan Korban Banjir Bandang', 'banjir-bandang', 'https://images.pexels.com/photos/6994992/pexels-photo-6994992.jpeg', 'Banjir bandang telah menyapu bersih...', 't', 't', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 'f', 'f', 'f', 'f', 10, 50000000, '2026-10-15 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(4, 4, 'Sedekah Paket Berbuka Puasa untuk Pejuang Jalanan', 'paket-berbuka', 'https://images.pexels.com/photos/6995201/pexels-photo-6995201.jpeg', 'Banyak saudara kita yang berpuasa...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 't', 'f', 'f', 'f', 3, 70000000, '2026-11-01 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(5, 5, 'Tunaikan Zakat Profesi & Maal Anda', 'zakat', 'https://images.pexels.com/photos/4968636/pexels-photo-4968636.jpeg', 'Sucikan harta Anda dengan menunaikan zakat.', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 't', 'f', 'f', 'f', 'f', 'f', 2, 500000000, '2027-10-12 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(6, 6, 'Qurban Pedalaman: Kambing Standar', 'qurban-kambing', 'https://images.pexels.com/photos/5698305/pexels-photo-5698305.jpeg', 'Qurban kambing (berat 23-25 kg)...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 't', 't', 'f', 'f', 'f', 11, 200000000, '2026-11-26 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(7, 6, 'Qurban Pedalaman: Patungan 1/7 Sapi', 'patungan-sapi', 'https://images.pexels.com/photos/422218/pexels-photo-422218.jpeg', 'Ikut patungan 1/7 bagian sapi qurban.', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 't', 't', 'f', 'f', 'f', 4, 315000000, '2026-11-26 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(8, 6, 'Qurban Pedalaman: 1 Ekor Sapi Utuh', 'qurban-sapi', 'https://images.pexels.com/photos/16399151/pexels-photo-16399151.jpeg', 'Tunaikan qurban 1 ekor sapi utuh...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 't', 't', 'f', 'f', 'f', 5, 420000000, '2026-11-26 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(9, 7, 'Infaq Operasional & Pengembangan Dakwah', 'infaq', 'https://images.pexels.com/photos/1310102/pexels-photo-1310102.jpeg', 'Salurkan infaq terbaik Anda untuk mendukung...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 'f', 'f', 't', 't', 6, NULL, NULL, 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(10, 4, 'Paket Basmalah (5 Buka Puasa + 8 Kado Yatim)', 'paket-basmalah', 'https://images.pexels.com/photos/9127752/pexels-photo-9127752.jpeg', 'Maksimalkan pahala Anda dengan program Bundling...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 't', 't', 'f', 'f', 7, 500000000, '2026-11-06 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(11, 8, 'Pembangunan Masjid Al-Ikhlas', 'masjid-alikhlas', 'https://images.pexels.com/photos/1310102/pexels-photo-1310102.jpeg', 'Pembangunan Masjid...', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 'f', 'f', 'f', 'f', 8, 1000000000, '2027-10-12 23:59:59+00', 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00'),
(12, 4, 'Kado Lebaran Yatim', 'kado-yatim', '', 'Hidden campaign for bundle item', 't', 'f', 10000, '{10000,25000,50000,100000,200000,500000}', 'f', 'f', 't', 'f', 'f', 'f', 9, NULL, NULL, 0.00, 'ACTIVE', '2026-05-01 03:32:23.084429+00', '2026-05-01 03:32:23.084429+00');

INSERT INTO "public"."campaign_qris_static" ("id", "campaign_id", "external_id", "qris_string", "status", "created_at") VALUES
(1, 9, 'QRIS-INFAQ-STATIC-001', '00020101021226660014ID.CO.QRIS.WWW01189360091530000020215ID102002131920315ID102002131925204481053033605802ID5902ID6015BANDUNG SELATAN61054023262070703A0163046C49', 'ACTIVE', '2026-05-01 03:32:23.084429+00'),
(2, 11, 'QRIS-MASJID-STATIC-002', '00020101021226660014ID.CO.QRIS.WWW01189360091530000020215ID102002131920315ID102002131925204481053033605802ID5902ID6015BANDUNG SELATAN61054023262070703A0163046C49', 'ACTIVE', '2026-05-01 03:32:23.084429+00');

INSERT INTO "public"."campaign_bundles" ("bundle_campaign_id", "item_campaign_id", "qty") VALUES
(10, 4, 5),
(10, 12, 8);

INSERT INTO "public"."campaign_variants" ("id", "campaign_id", "name", "price", "names_per_qty", "stock_limit", "is_active") VALUES
(1, 4, 'Paket Berbuka', 35000, 1, NULL, 't'),
(2, 6, 'Ekor Kambing', 2500000, 1, NULL, 't'),
(3, 7, 'Bagian Sapi (1/7)', 3000000, 1, NULL, 't'),
(4, 8, 'Ekor Sapi', 21000000, 7, NULL, 't'),
(5, 10, 'Paket Basmalah', 415000, 1, NULL, 't'),
(6, 12, 'Paket Kado Yatim', 30000, 1, NULL, 't');

INSERT INTO "public"."campaign_stats" ("campaign_id", "collected_amount", "donor_count", "package_sold", "views_count", "updated_at") VALUES
(1, 106400000, 1249, 0, 12400, '2026-05-09 14:21:43.98038+00'),
(2, 85000000, 830, 0, 0, '2026-05-01 03:32:23.084429+00'),
(3, 48050000, 2101, 0, 0, '2026-05-02 02:01:53.838451+00'),
(4, 24535000, 701, 0, 0, '2026-05-09 14:20:01.044551+00'),
(5, 125000000, 340, 0, 8900, '2026-05-01 03:32:23.084429+00'),
(6, 47500000, 19, 0, 0, '2026-05-02 02:04:21.722638+00'),
(7, 126000000, 42, 0, 0, '2026-05-01 03:32:23.084429+00'),
(8, 63000000, 3, 0, 4200, '2026-05-01 03:32:23.084429+00'),
(9, 15450000, 342, 0, 15600, '2026-05-01 03:32:23.084429+00'),
(10, 83000000, 200, 0, 0, '2026-05-01 03:32:23.084429+00'),
(11, 850000000, 1500, 0, 25000, '2026-05-01 03:32:23.084429+00'),
(12, 0, 0, 0, 0, '2026-05-01 03:32:23.084429+00');

INSERT INTO "public"."campaign_updates" ("id", "campaign_id", "title", "excerpt", "content", "image_url", "created_at") VALUES
(1, 1, 'Penyaluran Tahap 1: Biaya Cuci Darah', 'Dana sebesar Rp 15.000.000 telah disalurkan untuk biaya cuci darah Dik Rina...', 'Terima kasih Orang Baik!\n\nDana sebesar Rp 15.000.000 telah disalurkan untuk biaya cuci darah Dik Rina selama 1 bulan ke depan. Kondisi Rina saat ini berangsur stabil namun masih membutuhkan perawatan intensif.\n\nDoakan Rina terus ya agar segera pulih sepenuhnya!', 'https://images.pexels.com/photos/2324837/pexels-photo-2324837.jpeg', '2026-10-15 10:00:00+00'),
(2, 2, 'Peletakan Batu Pertama Dimulai!', 'Alhamdulillah, proses pembangunan sekolah darurat mulai berjalan dengan antusiasme warga...', 'Halo Kakak-kakak Baik!\n\nKabar gembira, berkat donasi Anda, peletakan batu pertama untuk sekolah darurat telah dilaksanakan. Warga sangat antusias bergotong royong membersihkan lahan.\n\nTerus dukung kami agar bangunan ini segera berdiri dan anak-anak bisa belajar dengan nyaman.', 'https://images.pexels.com/photos/11844555/pexels-photo-11844555.jpeg', '2026-10-10 10:00:00+00');

INSERT INTO "public"."affiliates" ("id", "affiliate_code", "name", "email", "phone", "password_hash", "balance", "status", "created_at") VALUES
(1, 'AFF-992', 'Budi Marketer', 'budi.marketer@email.com', '08123456789', '$2a$12$Dummy', 1250000, 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(2, 'KOHDENIS', 'koh denis', 'irvan@cnt.id', '081462206437', '$2a$12$DummyGeneratedByAdmin', 0, 'ACTIVE', '2026-04-19 02:49:12.748093+00');

INSERT INTO "public"."affiliate_commissions" ("affiliate_id", "campaign_id", "commission_type", "commission_value") VALUES
(1, 1, 'PERCENTAGE', 5.00),
(1, 5, 'PERCENTAGE', 2.00),
(1, 10, 'AMOUNT', 15000.00);

INSERT INTO "public"."affiliate_campaign_stats" ("affiliate_id", "campaign_id", "click_count", "converted_donors", "raised_amount", "commission_earned", "updated_at") VALUES
(1, 1, 12450, 342, 25000000, 1250000, '2026-05-01 03:32:23.084429+00'),
(2, 1, 0, 1, 500000, 0, '2026-05-09 14:21:44.34777+00'),
(2, 4, 0, 1, 35000, 0, '2026-05-09 14:20:02.514646+00');

INSERT INTO "public"."withdrawals" ("id", "affiliate_id", "amount", "bank_account_info", "status", "created_at", "processed_at") VALUES
(1, 1, 500000, 'BCA 123456789 a.n Budi Marketer', 'PROCESSED', '2026-05-01 03:32:23.084429+00', '2026-10-01 10:00:00+00'),
(2, 1, 750000, 'GoPay 08123456789', 'PROCESSED', '2026-05-01 03:32:23.084429+00', '2026-09-15 14:00:00+00');

INSERT INTO "public"."payment_methods" ("id", "code", "name", "logo_url", "type", "provider", "admin_fee_flat", "admin_fee_pct", "is_active", "is_redirect", "sort_order") VALUES
(1, 'GOPAY', 'GoPay', 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg', 'E-Wallet', 'Midtrans', 0, 0.00, 't', 'f', 3),
(2, 'BCA', 'BCA Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/bca9-IbKNyHu93Cn6SG23ej52n4WGSr9Q8i.jpg', 'va', 'Xendit', 0, 0.00, 't', 'f', 4),
(3, 'MANDIRI', 'Mandiri Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/mandiri-OiJcNXAXphLUz93kRkHBT0cDlelKq4.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 5),
(4, 'BSI', 'BSI Virtual Account', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg', 'va', 'Xendit', 0, 0.00, 't', 'f', 2),
(5, 'QR_CODE', 'QRIS Dynamic', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg', 'qr_code', 'Xendit', 0, 0.00, 't', 'f', 1),
(6, 'SHOPEEPAY', 'ShopeePay', 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg', 'E-Wallet', 'Xendit', 0, 0.00, 't', 'f', 6),
(7, 'DANA', 'DANA', 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg', 'E-Wallet', 'Xendit', 0, 0.00, 't', 'f', 7),
(8, 'LINKAJA', 'LinkAja', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/linkaja-logo-MQ0RdHT13BwF96O54LxltoM7rNK6JY.png', 'E-Wallet', 'Xendit', 0, 0.00, 't', 'f', 8),
(9, 'BRI', 'BRI Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/bri-PAGx45zIqEWTHhyJvBkbAXZouRYTfG.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 9),
(10, 'BNI', 'BNI Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/bni-YU2aAc67bEdD0QHeYCWqhRRmpAErd0.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 10),
(11, 'BJB', 'BJB Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/logo-bjb-5JyA52cVlLlt5wzrqmnqi012PX7CYu.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 11),
(12, 'BNC', 'BNC Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/HematpayBNC-VxizZScZEL7HoFAGGe3R7XTkUTmDry.webp', 'va', 'Xendit', 0, 0.00, 't', 'f', 12),
(13, 'CIMB', 'CIMB Niaga Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/cimb-XgzzZPNYCj1lEgpL4qWDouCLTUwA4M.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 13),
(14, 'MUAMALAT', 'Muamalat Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/muamalat-cYrxxhIFBpQYR2IIGIkIWV3KMsjDTP.png', 'va', 'Xendit', 0, 0.00, 't', 'f', 14),
(15, 'PERMATA', 'Permata Virtual Account', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/permata-0IaHmiPhtQlQLBmBp1vtp6nmfwosK2.jpg', 'va', 'Xendit', 0, 0.00, 't', 'f', 15),
(16, 'ALFAMART', 'Alfamart', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/alfamart-4jhk2YjGeoyKo8WEpjSrRNIB4Do5SL.png', 'retail_outlet', 'Xendit', 0, 0.00, 't', 'f', 16),
(17, 'INDOMARET', 'Indomaret', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/indomaret-6LTpkKX31ZqjHTVsiHwVow3jExN1ND.png', 'retail_outlet', 'Xendit', 0, 0.00, 't', 'f', 17),
(18, '0987654321|Yayasan Peduli Sesama', 'BCA (Transfer Manual)', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/bca9-Zi5EfD9vPgoDPwdsjIORMaXIj7mSoB.jpg', 'manual_transfer', 'Manual', 0, 0.00, 't', 'f', 18),
(19, '1234567890|Yayasan Peduli Sesama', 'Mandiri (Transfer Manual)', 'https://4jgsaomzelkwriht.public.blob.vercel-storage.com/mandiri-qHIfJdlwKGHQU020btV9Yhr0iUwo4G.png', 'manual_transfer', 'Manual', 0, 0.00, 't', 'f', 19);

INSERT INTO "public"."payment_instructions" ("id", "payment_method_id", "title", "content", "sort_order", "created_at") VALUES
(1, 2, 'Pembayaran via Mbanking', '<ol><li>Buka aplikasi BCA Mobile</li><li>Pilih m-BCA, lalu pilih m-Transfer</li><li>Masukkan nomor Virtual Account Anda, contoh: 3816523906568, lalu tekan OK</li><li>Klik tombol Kirim di pojok kanan atas untuk melanjutkan</li><li>Klik OK untuk melanjutkan</li><li>Masukkan PIN m-BCA Anda untuk otorisasi transaksi</li></ol>', 1, '2026-05-01 03:32:23.084429+00'),
(2, 2, 'Pembayaran via Ibanking', '<ol><li>Login ke KlikBCA Individual (https://ibank.klikbca.com)</li><li>Pilih menu Transfer, lalu pilih Transfer ke BCA Virtual Account</li><li>Masukkan nomor Virtual Account, contoh: 3816523906568</li><li>Pilih Lanjutkan untuk memproses pembayaran</li><li>Masukkan respon KEYBCA APPLI 1 yang muncul di Token BCA Anda, lalu klik tombol Kirim</li><li>Masukkan kode token autentikasi</li></ol>', 2, '2026-05-01 03:32:23.084429+00'),
(3, 2, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM BCA dan PIN Anda</li><li>Pilih menu Transaksi Lainnya</li><li>Pilih Transfer</li><li>Pilih Ke Rekening BCA Virtual Account</li><li>Masukkan nomor Virtual Account, contoh: 3816523906568. Tekan Benar untuk melanjutkan</li><li>Verifikasi detail Virtual Account lalu masukkan nominal yang akan ditransfer dan pilih Benar untuk konfirmasi</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li><li>Pilih Ya jika detail sudah benar atau Tidak jika detail belum benar</li></ol>', 3, '2026-05-01 03:32:23.084429+00'),
(4, 3, 'Pembayaran via Livin', '<ol><li>Login ke aplikasi Livin’ by Mandiri</li><li>Pilih Transfer IDR > Transfer ke penerima baru</li><li>Masukkan nomor virtual account (contoh: 8860863623046)</li><li>Masukkan atau konfirmasi jumlah pembayaran</li><li>Klik Lanjutkan</li><li>Masukkan PIN MPIN Anda</li></ol>', 4, '2026-05-01 03:32:23.084429+00'),
(5, 3, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa yang diinginkan</li><li>Masukkan PIN ATM</li><li>Pilih menu BAYAR > MULTI PAYMENT</li><li>Masukkan kode perusahaan 88608 (XENDIT), lalu tekan BENAR</li><li>Masukkan nomor virtual account (contoh: 8860863623046), lalu tekan BENAR</li><li>Masukkan jumlah pembayaran, lalu tekan BENAR</li><li>Konfirmasi detail pembayaran</li></ol>', 5, '2026-05-01 03:32:23.084429+00'),
(6, 9, 'Pembayaran via Brimo', '<ol><li>Login ke aplikasi BRI Mobile Banking</li><li>Pilih menu Pembayaran > Briva</li><li>Masukkan nomor virtual account (contoh: 1328216932121)</li><li>Masukkan jumlah pembayaran</li><li>Masukkan PIN</li><li>Klik Kirim</li></ol>', 6, '2026-05-01 03:32:23.084429+00'),
(7, 9, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Lainnya > Pembayaran > Pembayaran Lainnya > BRIVA</li><li>Masukkan nomor virtual account (contoh: 1328216932121)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran dan tekan YA</li></ol>', 7, '2026-05-01 03:32:23.084429+00'),
(8, 10, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi BNI Mobile Banking</li><li>Klik Transfer > Virtual Account Billing, lalu pilih rekening debet</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Jumlah pembayaran akan muncul di layar</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan password transaksi</li></ol>', 8, '2026-05-01 03:32:23.084429+00'),
(9, 10, 'Pembayaran via Ibanking', '<ol><li>Login ke https://ibank.bni.co.id</li><li>Klik Transfer > Virtual Account Billing</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Pilih rekening bank</li><li>Jumlah pembayaran akan muncul di layar</li><li>Masukkan kode token autentikasi</li></ol>', 9, '2026-05-01 03:32:23.084429+00'),
(10, 10, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Transaksi Lainnya > Transfer</li><li>Pilih tipe rekening</li><li>Masukkan nomor virtual account (contoh: 880849021633)</li><li>Jumlah pembayaran akan muncul di layar</li><li>Konfirmasi informasi pembayaran</li></ol>', 10, '2026-05-01 03:32:23.084429+00'),
(11, 11, 'Pembayaran via Mobile', '<ol><li>Buka aplikasi BJB Mobile</li><li>Masukkan User ID dan Password</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li><li>Masukkan Nomor Virtual Account, contoh: 1234999968795947</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li></ol>', 11, '2026-05-01 03:32:23.084429+00'),
(12, 11, 'Pembayaran via Ibanking', '<ol><li>Buka https://ib.bankbjb.co.id/bjb.net</li><li>Masukkan User ID dan Password</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li><li>Masukkan Nomor Virtual Account, contoh: 1234999968795947</li><li>Konfirmasi detail transaksi Anda yang muncul di layar</li></ol>', 12, '2026-05-01 03:32:23.084429+00'),
(13, 11, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM BJB dan PIN Anda</li><li>Pilih menu Transaksi Lainnya</li><li>Pilih Virtual Account</li><li>Pilih tipe rekening yang Anda gunakan untuk transfer (misal: Rekening Tabungan)</li></ol>', 13, '2026-05-01 03:32:23.084429+00'),
(14, 12, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi BNC mobile banking atau Neobank</li><li>Klik Hematpay VA & QRIS</li><li>Masukkan nomor virtual account (contoh: 9010001050411994)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan PIN</li></ol>', 14, '2026-05-01 03:32:23.084429+00'),
(15, 12, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran VA</li><li>Masukkan nomor virtual account (contoh: 9010001050411994)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi informasi pembayaran</li><li>Masukkan PIN</li></ol>', 15, '2026-05-01 03:32:23.084429+00'),
(16, 4, 'Pembayaran via Byond', '<ol><li>Login ke BYOND BSI</li><li>Pilih menu Bayar & Beli</li><li>Cari Xendit, Pilih Prefix VA: 9347 atau 9655</li><li>Masukkan kode (tanpa prefix) (contoh: 33371937)</li><li>Masukkan PIN</li><li>Konfirmasi detail pembayaran</li></ol>', 16, '2026-05-01 03:32:23.084429+00'),
(17, 4, 'Pembayaran via Ibanking', '<ol><li>Login ke https://bsinet.bankbsi.co.id</li><li>Klik Pembayaran</li><li>Pilih sumber pembayaran</li><li>Klik Institusi</li><li>Masukkan Xendit sebagai nama institusi (kode 9347)</li><li>Masukkan nomor virtual account (contoh: 33371937)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan kode token autentikasi</li></ol>', 17, '2026-05-01 03:32:23.084429+00'),
(18, 4, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran/Pembelian > Institusi</li><li>Masukkan nomor virtual account (contoh: 934733371937)</li><li>Konfirmasi detail pembayaran</li></ol>', 18, '2026-05-01 03:32:23.084429+00'),
(19, 4, 'Pembayaran via Antarbank', '<ol><li>Login ke rekening bank Anda</li><li>Klik Transfer > Pilih BSI</li><li>Masukkan 009 + kode BSI Virtual Account 9347 + nomor virtual account, (contoh: 934733371937)</li><li>Masukkan jumlah pembayaran</li><li>Pilih sumber pembayaran</li><li>Pilih Transfer Online</li><li>Konfirmasi detail pembayaran</li></ol>', 19, '2026-05-01 03:32:23.084429+00'),
(20, 13, 'Pembayaran via Octo', '<ol><li>Buka aplikasi Octo Mobile dan masukkan User ID dan Password Anda</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 20, '2026-05-01 03:32:23.084429+00'),
(21, 13, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM Anda</li><li>Pilih bahasa</li><li>Masukkan PIN ATM Anda</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 21, '2026-05-01 03:32:23.084429+00'),
(22, 13, 'Pembayaran via Ibanking', '<ol><li>Buka alamat https://www.octoclicks.co.id/login dan tekan Enter</li><li>Masukkan User ID dan Password</li><li>Pilih menu Transfer lalu pilih CIMB Niaga Lainnya</li><li>Masukkan Nomor Virtual Account Anda pada menu Input Baru</li><li>Masukkan jumlah pembayaran yang sesuai</li><li>Konfirmasi transaksi dan masukkan password Anda</li><li>Transaksi Anda selesai</li></ol>', 22, '2026-05-01 03:32:23.084429+00'),
(23, 14, 'Pembayaran via Mdin', '<ol><li>Login ke aplikasi MDIN mobile banking</li><li>Pilih menu Beli/Bayar > Beli/Bayar Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 23, '2026-05-01 03:32:23.084429+00'),
(24, 14, 'Pembayaran via Ibanking', '<ol><li>Login ke Muamalat Internet Banking</li><li>Klik menu Pembayaran > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 24, '2026-05-01 03:32:23.084429+00'),
(25, 14, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Pembayaran > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 9010001112341234234)</li><li>Masukkan jumlah pembayaran</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 25, '2026-05-01 03:32:23.084429+00'),
(26, 15, 'Pembayaran via Mobile', '<ol><li>Login ke aplikasi Permata mobile</li><li>Pilih menu Pembayaran Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Masukkan token autentikasi</li></ol>', 26, '2026-05-01 03:32:23.084429+00'),
(27, 15, 'Pembayaran via Ibanking', '<ol><li>Login ke https://www.permatanet.com</li><li>Pilih menu Pembayaran Tagihan > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan kode respon token SMS</li></ol>', 27, '2026-05-01 03:32:23.084429+00'),
(28, 15, 'Pembayaran via Atm', '<ol><li>Masukkan kartu ATM</li><li>Pilih bahasa</li><li>Masukkan PIN ATM</li><li>Pilih menu Transaksi Lainnya > Pembayaran > Pembayaran Lainnya > Virtual Account</li><li>Masukkan nomor virtual account (contoh: 729361827494)</li><li>Konfirmasi detail pembayaran</li><li>Masukkan PIN</li></ol>', 28, '2026-05-01 03:32:23.084429+00'),
(29, 16, 'Pembayaran via Note', '<ol><li>Anda dapat melakukan pembayaran di Alfamart Group (Alfamart, Alfamidi, Dan+Dan, Lawson).</li><li>Pembayaran di bawah Rp 2,5 Juta tersedia di Alfamart, Alfamidi, Dan+Dan, Lawson.</li><li>Pembayaran di atas Rp 2,5 Juta tidak tersedia di Alfamidi.</li><li>Kunjungi gerai ALFAMART terdekat sebelum batas waktu kode pembayaran/barcode habis</li><li>Beri tahu kasir bahwa Anda ingin melakukan pembayaran ke "[Nama Merchant]" via Xendit atau biarkan mereka memindai barcode di atas</li><li>Tunjukkan kode pembayaran/barcode ke kasir dan konfirmasi bahwa jumlahnya sudah benar</li><li>Informasikan kepada kasir jika Anda ingin membayar menggunakan Tunai saja, atau kombinasi Tunai dan Kartu Debit/Prabayar atau E-wallet.</li><li>Jumlah maksimum yang diizinkan bayar dengan Tunai adalah Rp 2,5 Juta, sisanya harus dikombinasikan menggunakan Kartu Debit/Prabayar atau E-wallet.</li><li>Lanjutkan proses pembayaran dengan jumlah yang tertera pada kode pembayaran/barcode Anda</li></ol>', 29, '2026-05-01 03:32:23.084429+00'),
(30, 1, 'Pembayaran via Gojek / GoPay', '<ol><li>Buka aplikasi Gojek / GoPay Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 30, '2026-05-01 03:32:23.084429+00'),
(31, 6, 'Pembayaran via Shopee', '<ol><li>Buka aplikasi Shopee Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 31, '2026-05-01 03:32:23.084429+00'),
(32, 7, 'Pembayaran via DANA', '<ol><li>Buka aplikasi DANA Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 32, '2026-05-01 03:32:23.084429+00'),
(33, 8, 'Pembayaran via LinkAja', '<ol><li>Buka aplikasi LinkAja Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 33, '2026-05-01 03:32:23.084429+00'),
(34, 5, 'Pembayaran via QRIS', '<ol><li>Buka aplikasi pembayaran pilihan Anda (GoPay, OVO, DANA, LinkAja, BCA Mobile, dll).</li><li>Pilih menu <strong>Scan / Bayar</strong>.</li><li>Scan QR Code yang tampil di layar.</li><li>Konfirmasi pembayaran dan masukkan PIN Anda.</li></ol>', 34, '2026-05-01 03:32:23.084429+00'),
(35, 18, 'Instruksi Transfer Manual BCA', '<ol><li>Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:</li><li><strong>Bank BCA: 1234567890</strong></li><li><strong>Atas Nama: Yayasan Peduli Sesama</strong></li><li>Simpan bukti transfer Anda.</li><li>Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.</li></ol>', 35, '2026-05-01 03:32:23.084429+00'),
(36, 19, 'Instruksi Transfer Manual Mandiri', '<ol><li>Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:</li><li><strong>Bank Mandiri: 9876543210</strong></li><li><strong>Atas Nama: Yayasan Peduli Sesama</strong></li><li>Simpan bukti transfer Anda.</li><li>Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.</li></ol>', 36, '2026-05-01 03:32:23.084429+00');

INSERT INTO "public"."donors" ("id", "name", "email", "phone", "is_anonymous_default", "created_at") VALUES
(1, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', '2026-05-01 03:32:23.084429+00'),
(2, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', '2026-05-01 03:32:23.084429+00'),
(3, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', '2026-05-01 03:32:23.084429+00'),
(4, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 't', '2026-05-01 03:44:09.059604+00'),
(5, 'eva', 'irvanadrian151@gmail.com', '089613727205', 'f', '2026-05-01 07:09:28.746656+00');

INSERT INTO "public"."invoices" ("id", "invoice_code", "donor_id", "payment_method_id", "donor_name_snapshot", "donor_email", "donor_phone", "is_anonymous", "base_amount", "admin_fee", "total_amount", "unique_code", "fb_click_id", "fb_browser_id", "tiktok_click_id", "google_click_id", "client_ip_address", "client_user_agent", "status", "va_number", "payment_url", "qris_dynamic", "xendit_payment_request_id", "doa", "created_at", "paid_at", "is_wa_checkout_sent", "is_wa_paid_sent", "is_email_checkout_sent", "is_email_paid_sent", "is_ads_sent") VALUES
(1, 'INV-20260501-1BFEEF', 4, 5, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 'f', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', NULL, '{"qr_string":"some-random-qr-string","type":"qr_code"}', NULL, 'pr-c9784c16-d254-481b-9a3f-a9120d98ece6', 'tes', '2026-05-01 03:44:06.827+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(1, 'TRX-9921', 1, 1, 'Andi Dermawan', NULL, NULL, 'f', 100000, 0, 100000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-12 14:30:00+00', '2026-10-12 14:32:00+00', 'f', 'f', 'f', 'f', 'f'),
(2, 'INV-20260501-3453CD', 4, 4, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 'f', 100000, 4000, 104000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '934799996103874', NULL, NULL, 'pr-16da46d2-8c5a-4c02-a6fe-81033886df1f', 'tes', '2026-05-01 03:47:16.658+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(2, 'TRX-9922', NULL, 2, 'Hamba Allah', NULL, NULL, 't', 500000, 4000, 504000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, NULL, '2026-10-12 15:10:00+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(3, 'INV-20260501-C753AB', 4, 12, 'irvan', 'irvan.freelance@gmail.com', '081462206437', 'f', 200000, 4000, 204000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '901000109999589084', NULL, NULL, 'pr-50783d0c-acc4-48de-8b3c-5232ffdb18dd', NULL, '2026-05-01 04:04:49.074+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(3, 'TRX-9923', 2, 3, 'Budi Santoso', NULL, NULL, 'f', 21000000, 4000, 21004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-12 16:05:00+00', '2026-10-12 16:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(4, 'INV-20260501-F056DE', 5, 7, 'eva', 'irvanadrian151@gmail.com', '089613727205', 't', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-service-dev.xendit.co/ewallets/sandbox/checkout?token=9315b8dff1c359267b0a767b8c474ba8ef04e237090abd146c2c12ba7e722db791d8d990ae3059995b22410d5e23a5b2a1587877b94a1d5ba8b8f836fcac68ed6fb6b1bb8361f894bafcb44d2993312826390c1dfd6ca01df42ac3b3a3be1dd75faa1c1121a1535d29a1e05120163ed4a5db21fa0e266bb8a031c071cef09ba6c4f67d62b6d4dd83897939124b155ad3dfd9a4e7680abc7131497c0132d2d5e911f1cdea952299b2b809bd85fb79e0997e0afba868ba87c2437aa99c8e5591f57a3c1ff64feec4158c4a138869dbffd0ff96c93088446e86daf7920de0047b79f0a6ef17ece84e20275ac4256e617ea5918f73b99f31acb0c138abe110859feb53eee4037c6c09ab6265498e4865cc5b69546b465e321217af6f', NULL, 'pr-1b935719-0ab1-4a23-adb7-09f1a5310b93', NULL, '2026-05-01 07:09:26.8+00', '2026-05-01 07:09:35.864107+00', 'f', 'f', 'f', 'f', 'f'),
(4, 'TRX-9924', 3, 4, 'Siti Aminah', NULL, NULL, 'f', 5000000, 4000, 5004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-11 09:15:00+00', '2026-10-11 09:20:00+00', 'f', 'f', 'f', 'f', 'f'),
(5, 'INV-20260501-325C38', 5, 6, 'eva', 'irvanadrian151@gmail.com', '089613727205', 'f', 200000, 0, 200000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7q55jg72snc73chp7jg', NULL, 'pr-d48c4796-e254-4716-9fa6-a8d4ff4c303b', NULL, '2026-05-01 07:14:21.137+00', '2026-05-01 07:36:01.946707+00', 'f', 'f', 'f', 'f', 'f'),
(5, 'INV-20261025-A001', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 150000, 4000, 154000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708123456789', NULL, NULL, NULL, 'Semoga Adik Rina cepat sembuh dan bisa sekolah lagi, semangat terus ya dek!', '2026-10-25 08:00:00+00', '2026-10-25 08:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(6, 'INV-20260502-D396FD', 4, 6, 'irvan', 'irvan@cnt.id', '6281462206437', 'f', 50000, 0, 50000, 0, NULL, NULL, NULL, NULL, '103.175.49.97', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qlm1g72snc73chpikg', NULL, 'pr-d9eed294-3130-4d3d-9312-cb76663821d1', NULL, '2026-05-02 02:01:41.339+00', '2026-05-02 02:01:50.825337+00', 'f', 'f', 'f', 'f', 'f'),
(6, 'INV-20261025-A002', 2, 3, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 250000, 4000, 254000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '888808567890123', NULL, NULL, NULL, 'Semoga pembangunan sekolah di NTT lancar dan jadi amal jariyah untuk kita semua.', '2026-10-25 09:00:00+00', '2026-10-25 09:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(7, 'INV-20260502-49B97B', 4, 6, 'irvan', 'irvan@cnt.id', '6281462206437', 'f', 2500000, 0, 2500000, 0, NULL, NULL, NULL, NULL, '103.175.49.97', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qln7072snc73chpil0', NULL, 'pr-e31d41b8-2bf6-49b2-ae53-9d5632e58508', 'tes', '2026-05-02 02:04:11.396+00', '2026-05-02 02:04:19.473501+00', 'f', 'f', 'f', 'f', 'f'),
(7, 'INV-20261025-A003', NULL, 5, 'Hamba Allah', NULL, NULL, 't', 100000, 0, 100000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Semoga saudara kita korban banjir diberi ketabahan dan kekuatan.', '2026-10-25 10:00:00+00', '2026-10-25 10:02:00+00', 'f', 'f', 'f', 'f', 'f'),
(8, 'INV-20260502-A609B2', 4, 6, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 't', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qv6b7bir0s73dngsmg', NULL, 'pr-7b4a6f73-9661-4d23-a0d8-5d116e0af0c5', 'semangat', '2026-05-02 12:50:51.255+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(8, 'INV-20261025-A004', 3, 1, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 35000, 0, 35000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Semoga nasi box ini berkah untuk yang menerima.', '2026-10-25 11:00:00+00', '2026-10-25 11:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(9, 'INV-20260503-AEC827', 4, 4, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 50000, 4000, 54000, 0, NULL, NULL, NULL, NULL, '114.122.78.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', '934799992134542', NULL, NULL, 'pr-1d39e37c-0656-4b62-bca6-9b53809fc017', NULL, '2026-05-03 03:31:47.392+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(9, 'INV-20261025-A005', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 1000000, 4000, 1004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708123456789', NULL, NULL, NULL, 'Zakat maal untuk membersihkan harta tahun ini.', '2026-10-25 12:00:00+00', '2026-10-25 12:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(10, 'INV-20260503-7127D7', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '114.122.78.98', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7rc4k7bir0s73dnh4og', NULL, 'pr-0dc968b3-060e-40f4-9cfd-7f30af7e224a', NULL, '2026-05-03 03:34:39.521+00', '2026-05-03 03:34:48.902342+00', 'f', 'f', 'f', 'f', 'f'),
(10, 'INV-20261025-A006', 2, 5, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 2500000, 0, 2500000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Bismillah, qurban kambing atas nama Bapak Budi Santoso.', '2026-10-25 13:00:00+00', '2026-10-25 13:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(11, 'INV-20260509-2E9F8C', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 35000, 0, 35000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk51qbq21c73amtqh0', NULL, 'pr-0d7fb8c4-37fb-40b7-8fbe-535bc3ed1933', NULL, '2026-05-09 14:19:50.708+00', '2026-05-09 14:19:58.69041+00', 'f', 'f', 'f', 'f', 'f'),
(11, 'INV-20261025-A007', 3, 5, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 3000000, 0, 3000000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Patungan qurban sapi, semoga bermanfaat untuk warga pedalaman.', '2026-10-25 14:00:00+00', '2026-10-25 14:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(12, 'INV-20260509-EE4C25', 4, 6, 'irvan', 'irvan@cnt.id', '081462206437', 'f', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '103.175.49.96', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PAID', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk5r2bq21c73amtqi0', NULL, 'pr-b03ed15d-b12e-408c-afac-1fdb6b5080f6', NULL, '2026-05-09 14:21:31.158+00', '2026-05-09 14:21:40.231356+00', 'f', 'f', 'f', 'f', 'f'),
(12, 'INV-20261025-A008', NULL, 5, 'Anonim', NULL, NULL, 't', 21000000, 0, 21000000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Qurban 1 ekor sapi utuh untuk kebaikan bersama.', '2026-10-25 15:00:00+00', '2026-10-25 15:20:00+00', 'f', 'f', 'f', 'f', 'f'),
(13, 'INV-20260509-3D5FA8', 4, 6, 'M. Irvan Adrian', 'irvan@cnt.id', '081462206437', 't', 500000, 0, 500000, 0, NULL, NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', 'PENDING', NULL, 'https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk8v2bq21c73amtql0', NULL, 'pr-04c8a6a9-14b6-4eaa-ba1b-655ae2ba88be', 'semangat', '2026-05-09 14:28:12.186+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(13, 'INV-20261025-A009', 1, 1, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 50000, 0, 50000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Sedikit infaq untuk operasional yayasan.', '2026-10-25 16:00:00+00', '2026-10-25 16:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(14, 'INV-20261025-A010', 2, 2, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 415000, 4000, 419000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708567890123', NULL, NULL, NULL, 'Paket kado yatim, semoga mereka bahagia di hari lebaran.', '2026-10-25 17:00:00+00', '2026-10-25 17:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(15, 'INV-20261025-A011', 3, 3, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 500000, 4000, 504000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '888808198765432', NULL, NULL, NULL, 'Untuk pembangunan masjid Al-Ikhlas, semoga segera tegak berdiri.', '2026-10-25 18:00:00+00', '2026-10-25 18:10:00+00', 'f', 'f', 'f', 'f', 'f');

INSERT INTO "public"."invoices_y2026m10" ("id", "invoice_code", "donor_id", "payment_method_id", "donor_name_snapshot", "donor_email", "donor_phone", "is_anonymous", "base_amount", "admin_fee", "total_amount", "unique_code", "fb_click_id", "fb_browser_id", "tiktok_click_id", "google_click_id", "client_ip_address", "client_user_agent", "status", "va_number", "payment_url", "qris_dynamic", "xendit_payment_request_id", "doa", "created_at", "paid_at", "is_wa_checkout_sent", "is_wa_paid_sent", "is_email_checkout_sent", "is_email_paid_sent", "is_ads_sent") VALUES
(1, 'TRX-9921', 1, 1, 'Andi Dermawan', NULL, NULL, 'f', 100000, 0, 100000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-12 14:30:00+00', '2026-10-12 14:32:00+00', 'f', 'f', 'f', 'f', 'f'),
(2, 'TRX-9922', NULL, 2, 'Hamba Allah', NULL, NULL, 't', 500000, 4000, 504000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, NULL, '2026-10-12 15:10:00+00', NULL, 'f', 'f', 'f', 'f', 'f'),
(3, 'TRX-9923', 2, 3, 'Budi Santoso', NULL, NULL, 'f', 21000000, 4000, 21004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-12 16:05:00+00', '2026-10-12 16:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(4, 'TRX-9924', 3, 4, 'Siti Aminah', NULL, NULL, 'f', 5000000, 4000, 5004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, NULL, '2026-10-11 09:15:00+00', '2026-10-11 09:20:00+00', 'f', 'f', 'f', 'f', 'f'),
(5, 'INV-20261025-A001', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 150000, 4000, 154000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708123456789', NULL, NULL, NULL, 'Semoga Adik Rina cepat sembuh dan bisa sekolah lagi, semangat terus ya dek!', '2026-10-25 08:00:00+00', '2026-10-25 08:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(6, 'INV-20261025-A002', 2, 3, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 250000, 4000, 254000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '888808567890123', NULL, NULL, NULL, 'Semoga pembangunan sekolah di NTT lancar dan jadi amal jariyah untuk kita semua.', '2026-10-25 09:00:00+00', '2026-10-25 09:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(7, 'INV-20261025-A003', NULL, 5, 'Hamba Allah', NULL, NULL, 't', 100000, 0, 100000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Semoga saudara kita korban banjir diberi ketabahan dan kekuatan.', '2026-10-25 10:00:00+00', '2026-10-25 10:02:00+00', 'f', 'f', 'f', 'f', 'f'),
(8, 'INV-20261025-A004', 3, 1, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 35000, 0, 35000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Semoga nasi box ini berkah untuk yang menerima.', '2026-10-25 11:00:00+00', '2026-10-25 11:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(9, 'INV-20261025-A005', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 1000000, 4000, 1004000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708123456789', NULL, NULL, NULL, 'Zakat maal untuk membersihkan harta tahun ini.', '2026-10-25 12:00:00+00', '2026-10-25 12:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(10, 'INV-20261025-A006', 2, 5, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 2500000, 0, 2500000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Bismillah, qurban kambing atas nama Bapak Budi Santoso.', '2026-10-25 13:00:00+00', '2026-10-25 13:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(11, 'INV-20261025-A007', 3, 5, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 3000000, 0, 3000000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Patungan qurban sapi, semoga bermanfaat untuk warga pedalaman.', '2026-10-25 14:00:00+00', '2026-10-25 14:10:00+00', 'f', 'f', 'f', 'f', 'f'),
(12, 'INV-20261025-A008', NULL, 5, 'Anonim', NULL, NULL, 't', 21000000, 0, 21000000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Qurban 1 ekor sapi utuh untuk kebaikan bersama.', '2026-10-25 15:00:00+00', '2026-10-25 15:20:00+00', 'f', 'f', 'f', 'f', 'f'),
(13, 'INV-20261025-A009', 1, 1, 'Andi Dermawan', 'andi@email.com', '08123456789', 'f', 50000, 0, 50000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', NULL, NULL, NULL, NULL, 'Sedikit infaq untuk operasional yayasan.', '2026-10-25 16:00:00+00', '2026-10-25 16:05:00+00', 'f', 'f', 'f', 'f', 'f'),
(14, 'INV-20261025-A010', 2, 2, 'Budi Santoso', 'budi.s@email.com', '08567890123', 'f', 415000, 4000, 419000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '807708567890123', NULL, NULL, NULL, 'Paket kado yatim, semoga mereka bahagia di hari lebaran.', '2026-10-25 17:00:00+00', '2026-10-25 17:15:00+00', 'f', 'f', 'f', 'f', 'f'),
(15, 'INV-20261025-A011', 3, 3, 'Siti Aminah', 'siti@email.com', '08198765432', 'f', 500000, 4000, 504000, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'PAID', '888808198765432', NULL, NULL, NULL, 'Untuk pembangunan masjid Al-Ikhlas, semoga segera tegak berdiri.', '2026-10-25 18:00:00+00', '2026-10-25 18:10:00+00', 'f', 'f', 'f', 'f', 'f');

INSERT INTO "public"."transactions" ("id", "invoice_id", "invoice_created_at", "campaign_id", "bundle_campaign_id", "variant_id", "affiliate_id", "qty", "amount", "affiliate_commission", "created_at") VALUES
(1, 1, '2026-05-01 03:44:06.827+00', 2, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 03:44:06.827+00'),
(1, 1, '2026-10-12 14:30:00+00', 1, NULL, NULL, NULL, 1, 100000, 0, '2026-10-12 14:30:00+00'),
(2, 2, '2026-05-01 03:47:16.658+00', 9, NULL, NULL, NULL, 1, 100000, 0, '2026-05-01 03:47:16.658+00'),
(2, 2, '2026-10-12 15:10:00+00', 5, NULL, NULL, NULL, 1, 500000, 0, '2026-10-12 15:10:00+00'),
(3, 3, '2026-05-01 04:04:49.074+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 04:04:49.074+00'),
(3, 3, '2026-10-12 16:05:00+00', 8, NULL, 4, NULL, 1, 21000000, 0, '2026-10-12 16:05:00+00'),
(4, 4, '2026-05-01 07:09:26.8+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 07:09:26.8+00'),
(4, 4, '2026-10-11 09:15:00+00', 11, NULL, NULL, NULL, 1, 5000000, 0, '2026-10-11 09:15:00+00'),
(5, 5, '2026-05-01 07:14:21.137+00', 1, NULL, NULL, NULL, 1, 200000, 0, '2026-05-01 07:14:21.137+00'),
(5, 5, '2026-10-25 08:00:00+00', 1, NULL, NULL, NULL, 1, 150000, 0, '2026-10-25 08:00:00+00'),
(6, 6, '2026-05-02 02:01:41.339+00', 3, NULL, NULL, NULL, 1, 50000, 0, '2026-05-02 02:01:41.339+00'),
(6, 6, '2026-10-25 09:00:00+00', 2, NULL, NULL, NULL, 1, 250000, 0, '2026-10-25 09:00:00+00'),
(7, 7, '2026-05-02 02:04:11.396+00', 6, NULL, NULL, NULL, 1, 2500000, 0, '2026-05-02 02:04:11.396+00'),
(7, 7, '2026-10-25 10:00:00+00', 3, NULL, NULL, NULL, 1, 100000, 0, '2026-10-25 10:00:00+00'),
(8, 8, '2026-05-02 12:50:51.255+00', 1, NULL, NULL, NULL, 1, 500000, 0, '2026-05-02 12:50:51.255+00'),
(8, 8, '2026-10-25 11:00:00+00', 4, NULL, 1, NULL, 1, 35000, 0, '2026-10-25 11:00:00+00'),
(9, 9, '2026-05-03 03:31:47.392+00', 2, NULL, NULL, NULL, 1, 50000, 0, '2026-05-03 03:31:47.392+00'),
(9, 9, '2026-10-25 12:00:00+00', 5, NULL, NULL, NULL, 1, 1000000, 0, '2026-10-25 12:00:00+00'),
(10, 10, '2026-05-03 03:34:39.521+00', 1, NULL, NULL, NULL, 1, 500000, 0, '2026-05-03 03:34:39.521+00'),
(10, 10, '2026-10-25 13:00:00+00', 6, NULL, 2, NULL, 1, 2500000, 0, '2026-10-25 13:00:00+00'),
(11, 11, '2026-05-09 14:19:50.708+00', 4, NULL, NULL, 2, 1, 35000, 0, '2026-05-09 14:19:50.708+00'),
(11, 11, '2026-10-25 14:00:00+00', 7, NULL, 3, NULL, 1, 3000000, 0, '2026-10-25 14:00:00+00'),
(12, 12, '2026-05-09 14:21:31.158+00', 1, NULL, NULL, 2, 1, 500000, 0, '2026-05-09 14:21:31.158+00'),
(12, 12, '2026-10-25 15:00:00+00', 8, NULL, 4, NULL, 1, 21000000, 0, '2026-10-25 15:00:00+00'),
(13, 13, '2026-05-09 14:28:12.186+00', 1, NULL, NULL, 2, 1, 500000, 0, '2026-05-09 14:28:12.186+00'),
(13, 13, '2026-10-25 16:00:00+00', 9, NULL, NULL, NULL, 1, 50000, 0, '2026-10-25 16:00:00+00'),
(14, 14, '2026-10-25 17:00:00+00', 10, NULL, 5, NULL, 1, 415000, 0, '2026-10-25 17:00:00+00'),
(15, 15, '2026-10-25 18:00:00+00', 11, NULL, NULL, NULL, 1, 500000, 0, '2026-10-25 18:00:00+00');

INSERT INTO "public"."transactions_y2026m10" ("id", "invoice_id", "invoice_created_at", "campaign_id", "bundle_campaign_id", "variant_id", "affiliate_id", "qty", "amount", "affiliate_commission", "created_at") VALUES
(1, 1, '2026-10-12 14:30:00+00', 1, NULL, NULL, NULL, 1, 100000, 0, '2026-10-12 14:30:00+00'),
(2, 2, '2026-10-12 15:10:00+00', 5, NULL, NULL, NULL, 1, 500000, 0, '2026-10-12 15:10:00+00'),
(3, 3, '2026-10-12 16:05:00+00', 8, NULL, 4, NULL, 1, 21000000, 0, '2026-10-12 16:05:00+00'),
(4, 4, '2026-10-11 09:15:00+00', 11, NULL, NULL, NULL, 1, 5000000, 0, '2026-10-11 09:15:00+00'),
(5, 5, '2026-10-25 08:00:00+00', 1, NULL, NULL, NULL, 1, 150000, 0, '2026-10-25 08:00:00+00'),
(6, 6, '2026-10-25 09:00:00+00', 2, NULL, NULL, NULL, 1, 250000, 0, '2026-10-25 09:00:00+00'),
(7, 7, '2026-10-25 10:00:00+00', 3, NULL, NULL, NULL, 1, 100000, 0, '2026-10-25 10:00:00+00'),
(8, 8, '2026-10-25 11:00:00+00', 4, NULL, 1, NULL, 1, 35000, 0, '2026-10-25 11:00:00+00'),
(9, 9, '2026-10-25 12:00:00+00', 5, NULL, NULL, NULL, 1, 1000000, 0, '2026-10-25 12:00:00+00'),
(10, 10, '2026-10-25 13:00:00+00', 6, NULL, 2, NULL, 1, 2500000, 0, '2026-10-25 13:00:00+00'),
(11, 11, '2026-10-25 14:00:00+00', 7, NULL, 3, NULL, 1, 3000000, 0, '2026-10-25 14:00:00+00'),
(12, 12, '2026-10-25 15:00:00+00', 8, NULL, 4, NULL, 1, 21000000, 0, '2026-10-25 15:00:00+00'),
(13, 13, '2026-10-25 16:00:00+00', 9, NULL, NULL, NULL, 1, 50000, 0, '2026-10-25 16:00:00+00'),
(14, 14, '2026-10-25 17:00:00+00', 10, NULL, 5, NULL, 1, 415000, 0, '2026-10-25 17:00:00+00'),
(15, 15, '2026-10-25 18:00:00+00', 11, NULL, NULL, NULL, 1, 500000, 0, '2026-10-25 18:00:00+00');

INSERT INTO "public"."transaction_qurban_names" ("id", "transaction_id", "transaction_created_at", "mudhohi_name", "created_at") VALUES
(1, 3, '2026-10-12 16:05:00+00', 'Budi Santoso', '2026-10-12 16:05:00+00'),
(2, 3, '2026-10-12 16:05:00+00', 'Istri Budi', '2026-10-12 16:05:00+00'),
(3, 3, '2026-10-12 16:05:00+00', 'Anak 1', '2026-10-12 16:05:00+00'),
(4, 3, '2026-10-12 16:05:00+00', 'Anak 2', '2026-10-12 16:05:00+00'),
(5, 3, '2026-10-12 16:05:00+00', 'Anak 3', '2026-10-12 16:05:00+00'),
(6, 3, '2026-10-12 16:05:00+00', 'Anak 4', '2026-10-12 16:05:00+00'),
(7, 3, '2026-10-12 16:05:00+00', 'Anak 5', '2026-10-12 16:05:00+00');

INSERT INTO "public"."payment_logs" ("id", "invoice_code", "endpoint", "type", "request_payload", "response_payload", "http_status", "created_at") VALUES
(1, 'TRX-9921', 'https://api.midtrans.com/v2/charge', 'PAYMENT_REQUEST', '{"payment_type": "gopay", "transaction_details": {"order_id": "TRX-9921", "gross_amount": 100000}}', '{"status_code": "201", "transaction_status": "pending", "actions": [{"name": "generate-qr-code", "url": "https://api.sandbox.midtrans.com/v2/gopay/123456/qr-code"}]}', 201, '2026-05-01 03:32:23.084429+00'),
(2, 'TRX-9922', 'https://api.xendit.co/v2/virtual_accounts', 'PAYMENT_REQUEST', '{"external_id": "TRX-9922", "bank_code": "BCA", "name": "Hamba Allah", "expected_amount": 504000, "is_closed": true}', '{"id": "614c...va", "external_id": "TRX-9922", "bank_code": "BCA", "merchant_code": "8077", "account_number": "807708123456789", "expected_amount": 504000, "status": "PENDING"}', 200, '2026-05-01 03:32:23.084429+00'),
(3, 'TRX-9923', 'https://api.xendit.co/callback/virtual_accounts', 'CALLBACK', '{"external_id": "TRX-9923", "amount": 21004000, "status": "COMPLETED", "transaction_timestamp": "2026-10-12T16:15:00.000Z"}', '{"status": "success", "message": "Callback processed and jobs queued"}', 200, '2026-05-01 03:32:23.084429+00'),
(4, 'a5151a05-e84d-4cef-bb17-1ref3e7fb3a', '/api/webhooks/xendit:payment.succeeded', NULL, '{"event":"payment.succeeded","business_id":"sample_business_id","created":"2022-02-16T06:01:09.997108276Z","data":{"id":"pymt-2e9badf8-1473-4e8a-a1cf-d1e3214afc0f","amount":15000,"country":"ID","created":"2022-02-16T06:01:07.322974428Z","currency":"IDR","payment_request_id":"pr-df560c7d-b059-4789-ad2f-3cee5d8230a8","reference_id":"a5151a05-e84d-4cef-bb17-1ref3e7fb3a","status":"SUCCEEDED","customer_id":null,"description":null,"payment_method":{"id":"pm-e12563a5-a970-4fff-ba3b-242cs0443db7","type":"OVER_THE_COUNTER","reusability":"ONE_TIME_USE","status":"EXPIRED","over_the_counter":{"channel_code":"INDOMARET","channel_properties":{"customer_name":"John Doe","expires_at":"2022-02-18T06:00:49.018714479Z","payment_code":"XENVCQKCUBNRQ"}},"metadata":{"key":"value"},"direct_debit":null,"ewallet":null,"qr_code":null,"virtual_account":null,"created":"2022-02-16T06:00:49.078139Z","updated":"2022-02-16T06:00:49.078139Z"},"metadata":{"key":"value"},"payment_detail":null,"failure_code":null,"channel_properties":null,"updated":"2022-02-16T06:01:07.322974428Z"}}', '{"status":"success"}', 200, '2026-05-01 07:07:59.098135+00'),
(5, 'INV-20260501-F056DE', '/api/checkout', NULL, '{"campaignId":1,"amount":200000,"donorName":"eva","donorEmail":"irvanadrian151@gmail.com","donorPhone":"089613727205","isAnonymous":true,"doa":null,"paymentMethodId":7,"paymentType":"DANA","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-1b935719-0ab1-4a23-adb7-09f1a5310b93","country":"ID","amount":200000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260501-F056DE","payment_method":{"id":"pm-4a7e53cb-84c2-4023-bd90-952cbd16a68f","type":"EWALLET","reference_id":"b46c0736-a782-48c1-9b43-a841df44164b","description":null,"created":"2026-05-01T07:09:27.921771806Z","updated":"2026-05-01T07:09:27.921771806Z","card":null,"ewallet":{"channel_code":"DANA","channel_properties":{"mobile_number":"+6289613727205","success_return_url":"https://lenteradonasi.vercel.app/invoice/INV-20260501-F056DE"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260501-F056DE"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-01T07:09:27.987304036Z","updated":"2026-05-01T07:09:27.987304036Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-service-dev.xendit.co/ewallets/sandbox/checkout?token=9315b8dff1c359267b0a767b8c474ba8ef04e237090abd146c2c12ba7e722db791d8d990ae3059995b22410d5e23a5b2a1587877b94a1d5ba8b8f836fcac68ed6fb6b1bb8361f894bafcb44d2993312826390c1dfd6ca01df42ac3b3a3be1dd75faa1c1121a1535d29a1e05120163ed4a5db21fa0e266bb8a031c071cef09ba6c4f67d62b6d4dd83897939124b155ad3dfd9a4e7680abc7131497c0132d2d5e911f1cdea952299b2b809bd85fb79e0997e0afba868ba87c2437aa99c8e5591f57a3c1ff64feec4158c4a138869dbffd0ff96c93088446e86daf7920de0047b79f0a6ef17ece84e20275ac4256e617ea5918f73b99f31acb0c138abe110859feb53eee4037c6c09ab6265498e4865cc5b69546b465e321217af6f","url_type":"WEB","method":"GET","qr_code":null},{"action":"AUTH","url":"https://ewallet-service-dev.xendit.co/ewallets/sandbox/checkout?token=9315b8dff1c359267b0a767b8c474ba8ef04e237090abd146c2c12ba7e722db791d8d990ae3059995b22410d5e23a5b2a1587877b94a1d5ba8b8f836fcac68ed6fb6b1bb8361f894bafcb44d2993312826390c1dfd6ca01df42ac3b3a3be1dd75faa1c1121a1535d29a1e05120163ed4a5db21fa0e266bb8a031c071cef09ba6c4f67d62b6d4dd83897939124b155ad3dfd9a4e7680abc7131497c0132d2d5e911f1cdea952299b2b809bd85fb79e0997e0afba868ba87c2437aa99c8e5591f57a3c1ff64feec4158c4a138869dbffd0ff96c93088446e86daf7920de0047b79f0a6ef17ece84e20275ac4256e617ea5918f73b99f31acb0c138abe110859feb53eee4037c6c09ab6265498e4865cc5b69546b465e321217af6f","url_type":"MOBILE","method":"GET","qr_code":null}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260501-F056DE","payment_url":"https://ewallet-service-dev.xendit.co/ewallets/sandbox/checkout?token=9315b8dff1c359267b0a767b8c474ba8ef04e237090abd146c2c12ba7e722db791d8d990ae3059995b22410d5e23a5b2a1587877b94a1d5ba8b8f836fcac68ed6fb6b1bb8361f894bafcb44d2993312826390c1dfd6ca01df42ac3b3a3be1dd75faa1c1121a1535d29a1e05120163ed4a5db21fa0e266bb8a031c071cef09ba6c4f67d62b6d4dd83897939124b155ad3dfd9a4e7680abc7131497c0132d2d5e911f1cdea952299b2b809bd85fb79e0997e0afba868ba87c2437aa99c8e5591f57a3c1ff64feec4158c4a138869dbffd0ff96c93088446e86daf7920de0047b79f0a6ef17ece84e20275ac4256e617ea5918f73b99f31acb0c138abe110859feb53eee4037c6c09ab6265498e4865cc5b69546b465e321217af6f","va_number":null}}}', 200, '2026-05-01 07:09:29.95099+00'),
(6, 'INV-20260501-F056DE', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-01T07:09:35.250Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":200000,"channel_properties":null,"country":"ID","created":"2026-05-01T07:09:28.02488Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_305711b8-9e9c-44cb-8eb4-6032273f0ec1","items":null,"metadata":{"invoice_code":"INV-20260501-F056DE"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-01T07:09:27.921771Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"DANA","channel_properties":{"mobile_number":"+6289613727205","success_return_url":"https://lenteradonasi.vercel.app/invoice/INV-20260501-F056DE"}},"id":"pm-4a7e53cb-84c2-4023-bd90-952cbd16a68f","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"b46c0736-a782-48c1-9b43-a841df44164b","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-01T07:09:35.22872Z","virtual_account":null},"payment_request_id":"pr-1b935719-0ab1-4a23-adb7-09f1a5310b93","reference_id":"INV-20260501-F056DE","status":"SUCCEEDED","updated":"2026-05-01T07:09:34.989945Z"}}', '{"status":"success"}', 200, '2026-05-01 07:09:36.311389+00'),
(7, '90392f42-d98a-49ef-a7f3-90392f42d98a', '/api/webhooks/xendit:payment.capture', NULL, '{"created":"2025-02-13T08:29:41.734Z","business_id":"62440e322008e87fb29c1fd0","event":"payment.capture","api_version":"v3","data":{"payment_id":"py-97716cc2-2840-4ead-949b-db60e9aeb55e","business_id":"62440e322008e87fb29c1fd0","reference_id":"90392f42-d98a-49ef-a7f3-90392f42d98a","payment_request_id":"pr-ced7965b-d588-49f1-ba41-d499277e5395","customer_id":"cust-c1a6b0a0-a501-4479-8b57-d038601f139e","type":"PAY","country":"ID","currency":"IDR","request_amount":10000,"capture_method":"AUTOMATIC","channel_code":"CARDS","status":"SUCCEEDED","captures":[{"capture_id":"cptr-d87d1219-08ad-4ab1-84db-1c4c4f6aa0bd","capture_timestamp":"2025-02-13T08:29:41.149Z","capture_amount":10000}],"payment_details":{"authorization_data":{"cvn_verification_result":"M","address_verification_result":"M","network_response_code":"00","network_response_code_descriptor":"Approved and completed sucessfully","authorization_code":"831000","retrieval_reference_number":"504408583907","acquirer_merchant_id":"xendit_ctv_agg","reconciliation_id":"7394353802126356203812","network_transaction_id":"016153570198200"}},"created":"2025-02-13T08:29:35.435Z","updated":"2025-02-13T08:29:35.444Z"}}', '{"status":"success"}', 200, '2026-05-01 07:09:52.34142+00'),
(8, 'test-payload', '/api/webhooks/xendit:ewallet.capture', NULL, '{"data":{"id":"ewc_95d47d3a-db03-4b4b-9b6c-71077157cbc8","basket":null,"status":"SUCCEEDED","actions":{"mobile_web_checkout_url":"","desktop_web_checkout_url":"","mobile_deeplink_checkout_url":"https://wsa.uat.wallet.airpay.co.id/universal-link/wallet/pay?deep_and_deferred=1&token=dFhkbmR1bTBIamhWwFfJaB-n_6eGjr1eAHnlwWEJDsEpIU_-8m0QS5Tb1nFp_ZEtGrgHWKV8LuV6rwVL2COCVw"},"created":"2020-10-21T13:57:43.355897Z","updated":"2020-10-21T13:57:43.730483Z","currency":"IDR","metadata":{"branch_code":"senayan_372"},"voided_at":null,"capture_now":true,"customer_id":null,"callback_url":"https://webhook.site/5eebb675-6102-453a-a81c-de95fb08bc77","channel_code":"ID_SHOPEEPAY","failure_code":null,"reference_id":"test-payload","charge_amount":20000,"capture_amount":20000,"checkout_method":"ONE_TIME_PAYMENT","payment_method_id":null,"channel_properties":{"success_redirect_url":"https://google.com"},"is_redirect_required":true},"event":"ewallet.capture","created":"2020-10-21T13:59:14.536400713Z","business_id":"59e0daf7049b567510c63f67"}', '{"status":"success"}', 200, '2026-05-01 07:09:59.198002+00'),
(9, 'INV-20260501-325C38', '/api/checkout', NULL, '{"campaignId":1,"amount":200000,"donorName":"eva","donorEmail":"irvanadrian151@gmail.com","donorPhone":"089613727205","isAnonymous":false,"doa":null,"paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-d48c4796-e254-4716-9fa6-a8d4ff4c303b","country":"ID","amount":200000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260501-325C38","payment_method":{"id":"pm-f47908ab-0da1-4da5-95a0-f486594f87bf","type":"EWALLET","reference_id":"5db8c76b-03c9-4314-9545-1c815ec790c8","description":null,"created":"2026-05-01T07:14:22.2428075Z","updated":"2026-05-01T07:14:22.2428075Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6289613727205","success_return_url":"https://lenteradonasi.vercel.app/invoice/INV-20260501-325C38"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260501-325C38"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-01T07:14:22.30869139Z","updated":"2026-05-01T07:14:22.30869139Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7q55jg72snc73chp7jg","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260501-325C38","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7q55jg72snc73chp7jg","va_number":null}}}', 200, '2026-05-01 07:14:23.553029+00'),
(10, 'INV-20260501-325C38', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-01T07:35:59.734Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":200000,"channel_properties":null,"country":"ID","created":"2026-05-01T07:14:22.369589Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_7567b240-c0d5-4f97-92f5-ecd2a0ae297b","items":null,"metadata":{"invoice_code":"INV-20260501-325C38"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-01T07:14:22.242807Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6289613727205","success_return_url":"https://lenteradonasi.vercel.app/invoice/INV-20260501-325C38"}},"id":"pm-f47908ab-0da1-4da5-95a0-f486594f87bf","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"5db8c76b-03c9-4314-9545-1c815ec790c8","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-01T07:35:59.705151Z","virtual_account":null},"payment_request_id":"pr-d48c4796-e254-4716-9fa6-a8d4ff4c303b","reference_id":"INV-20260501-325C38","status":"SUCCEEDED","updated":"2026-05-01T07:35:59.383961Z"}}', '{"status":"success"}', 200, '2026-05-01 07:36:02.521245+00'),
(11, 'INV-20260502-D396FD', '/api/checkout', NULL, '{"campaignId":3,"amount":50000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"6281462206437","isAnonymous":false,"doa":null,"paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-d9eed294-3130-4d3d-9312-cb76663821d1","country":"ID","amount":50000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260502-D396FD","payment_method":{"id":"pm-2cde2c41-3103-4737-a707-6457c2c4f12a","type":"EWALLET","reference_id":"261d676e-f819-4c14-8388-08a94ea0d01f","description":null,"created":"2026-05-02T02:01:42.542848331Z","updated":"2026-05-02T02:01:42.542848331Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260502-D396FD"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260502-D396FD"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-02T02:01:42.630280929Z","updated":"2026-05-02T02:01:42.630280929Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qlm1g72snc73chpikg","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260502-D396FD","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qlm1g72snc73chpikg","va_number":null}}}', 200, '2026-05-02 02:01:44.527856+00'),
(12, 'INV-20260502-D396FD', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-02T02:01:49.825Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":50000,"channel_properties":null,"country":"ID","created":"2026-05-02T02:01:42.687189Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_9df46aa4-91c4-4ab4-a7cc-889b4a8fa67b","items":null,"metadata":{"invoice_code":"INV-20260502-D396FD"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-02T02:01:42.542848Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260502-D396FD"}},"id":"pm-2cde2c41-3103-4737-a707-6457c2c4f12a","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"261d676e-f819-4c14-8388-08a94ea0d01f","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-02T02:01:49.800812Z","virtual_account":null},"payment_request_id":"pr-d9eed294-3130-4d3d-9312-cb76663821d1","reference_id":"INV-20260502-D396FD","status":"SUCCEEDED","updated":"2026-05-02T02:01:49.424461Z"}}', '{"status":"success"}', 200, '2026-05-02 02:01:51.278551+00'),
(13, 'INV-20260502-49B97B', '/api/checkout', NULL, '{"campaignId":6,"amount":2500000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"6281462206437","isAnonymous":false,"doa":"tes","paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-e31d41b8-2bf6-49b2-ae53-9d5632e58508","country":"ID","amount":2500000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260502-49B97B","payment_method":{"id":"pm-2dd90f8a-ca41-4fa1-9532-5d0cf3a71d75","type":"EWALLET","reference_id":"573d07f1-5faf-4851-b143-5005f207cf2c","description":null,"created":"2026-05-02T02:04:12.476727651Z","updated":"2026-05-02T02:04:12.476727651Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260502-49B97B"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260502-49B97B"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-02T02:04:12.558688787Z","updated":"2026-05-02T02:04:12.558688787Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qln7072snc73chpil0","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260502-49B97B","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qln7072snc73chpil0","va_number":null}}}', 200, '2026-05-02 02:04:13.768534+00'),
(14, 'INV-20260502-49B97B', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-02T02:04:18.841Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":2500000,"channel_properties":null,"country":"ID","created":"2026-05-02T02:04:12.629961Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_ca76b1ca-3f36-4f14-aa85-dcebb678acd7","items":null,"metadata":{"invoice_code":"INV-20260502-49B97B"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-02T02:04:12.476727Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260502-49B97B"}},"id":"pm-2dd90f8a-ca41-4fa1-9532-5d0cf3a71d75","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"573d07f1-5faf-4851-b143-5005f207cf2c","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-02T02:04:18.817257Z","virtual_account":null},"payment_request_id":"pr-e31d41b8-2bf6-49b2-ae53-9d5632e58508","reference_id":"INV-20260502-49B97B","status":"SUCCEEDED","updated":"2026-05-02T02:04:18.438268Z"}}', '{"status":"success"}', 200, '2026-05-02 02:04:19.908432+00'),
(15, 'INV-20260502-A609B2', '/api/checkout', NULL, '{"campaignId":1,"amount":500000,"donorName":"M. Irvan Adrian","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":true,"doa":"semangat","paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-7b4a6f73-9661-4d23-a0d8-5d116e0af0c5","country":"ID","amount":500000,"currency":"IDR","business_id":"620343b4c529b6a9a4547532","reference_id":"INV-20260502-A609B2","payment_method":{"id":"pm-5ef352c7-03e3-4ead-8d89-6315285c5b7b","type":"EWALLET","reference_id":"4ec736ac-721a-42a1-abe0-5aebdede52c1","description":null,"created":"2026-05-02T12:50:51.997561026Z","updated":"2026-05-02T12:50:51.997561026Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"http://localhost:3000/status/INV-20260502-A609B2"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260502-A609B2"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-02T12:50:52.070733634Z","updated":"2026-05-02T12:50:52.070733634Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qv6b7bir0s73dngsmg","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260502-A609B2","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7qv6b7bir0s73dngsmg","va_number":null}}}', 200, '2026-05-02 12:50:52.728318+00'),
(16, 'INV-20260503-AEC827', '/api/checkout', NULL, '{"campaignId":2,"amount":50000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":false,"doa":null,"paymentMethodId":4,"paymentType":"BSI","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-1d39e37c-0656-4b62-bca6-9b53809fc017","country":"ID","amount":54000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260503-AEC827","payment_method":{"id":"pm-c99eabe4-9468-4eee-9680-015e4cd9e98a","type":"VIRTUAL_ACCOUNT","reference_id":"d247211b-9265-4799-a4c8-2aaa424a75b1","description":null,"created":"2026-05-03T03:31:49.299235397Z","updated":"2026-05-03T03:31:49.558106918Z","card":null,"ewallet":null,"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":{"amount":54000,"currency":"IDR","channel_code":"BSI","channel_properties":{"customer_name":"Lentera Donasi","virtual_account_number":"934799992134542","expires_at":"2057-05-03T03:31:49.40598Z"}},"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"PENDING"},"description":null,"metadata":{"invoice_code":"INV-20260503-AEC827"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-03T03:31:49.279614821Z","updated":"2026-05-03T03:31:49.279614821Z","status":"PENDING","actions":[],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260503-AEC827","payment_url":null,"va_number":"934799992134542"}}}', 200, '2026-05-03 03:31:51.013228+00'),
(17, 'INV-20260503-7127D7', '/api/checkout', NULL, '{"campaignId":1,"amount":500000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":false,"doa":null,"paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":null,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-0dc968b3-060e-40f4-9cfd-7f30af7e224a","country":"ID","amount":500000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260503-7127D7","payment_method":{"id":"pm-378b46ea-261a-4de0-a8f5-9c2a74854eb4","type":"EWALLET","reference_id":"08884836-9e9b-4b37-af46-4b9755ced0fb","description":null,"created":"2026-05-03T03:34:40.623759239Z","updated":"2026-05-03T03:34:40.623759239Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260503-7127D7"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260503-7127D7"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-03T03:34:40.690071292Z","updated":"2026-05-03T03:34:40.690071292Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7rc4k7bir0s73dnh4og","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260503-7127D7","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7rc4k7bir0s73dnh4og","va_number":null}}}', 200, '2026-05-03 03:34:41.911199+00'),
(18, 'INV-20260503-7127D7', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-03T03:34:47.831Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":500000,"channel_properties":null,"country":"ID","created":"2026-05-03T03:34:40.751381Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_c21b69f2-996d-4407-a91d-1dbee7a5271f","items":null,"metadata":{"invoice_code":"INV-20260503-7127D7"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-03T03:34:40.623759Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260503-7127D7"}},"id":"pm-378b46ea-261a-4de0-a8f5-9c2a74854eb4","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"08884836-9e9b-4b37-af46-4b9755ced0fb","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-03T03:34:47.807494Z","virtual_account":null},"payment_request_id":"pr-0dc968b3-060e-40f4-9cfd-7f30af7e224a","reference_id":"INV-20260503-7127D7","status":"SUCCEEDED","updated":"2026-05-03T03:34:47.549335Z"}}', '{"status":"success"}', 200, '2026-05-03 03:34:49.346156+00'),
(19, 'INV-20260509-2E9F8C', '/api/checkout', NULL, '{"campaignId":4,"amount":35000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":false,"doa":null,"paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":2,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-0d7fb8c4-37fb-40b7-8fbe-535bc3ed1933","country":"ID","amount":35000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260509-2E9F8C","payment_method":{"id":"pm-24921980-5c2d-4a19-92ea-acc3d717742e","type":"EWALLET","reference_id":"fbcea4e7-91c1-40af-aaf5-38f0f7a6756d","description":null,"created":"2026-05-09T14:19:51.831550953Z","updated":"2026-05-09T14:19:51.831550953Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260509-2E9F8C"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260509-2E9F8C"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-09T14:19:51.904751172Z","updated":"2026-05-09T14:19:51.904751172Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk51qbq21c73amtqh0","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260509-2E9F8C","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk51qbq21c73amtqh0","va_number":null}}}', 200, '2026-05-09 14:19:53.168991+00'),
(20, 'INV-20260509-2E9F8C', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-09T14:19:57.632Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":35000,"channel_properties":null,"country":"ID","created":"2026-05-09T14:19:51.975419Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_4bc68fbe-beed-4a7f-a606-90e48252104a","items":null,"metadata":{"invoice_code":"INV-20260509-2E9F8C"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-09T14:19:51.83155Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260509-2E9F8C"}},"id":"pm-24921980-5c2d-4a19-92ea-acc3d717742e","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"fbcea4e7-91c1-40af-aaf5-38f0f7a6756d","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-09T14:19:57.601186Z","virtual_account":null},"payment_request_id":"pr-0d7fb8c4-37fb-40b7-8fbe-535bc3ed1933","reference_id":"INV-20260509-2E9F8C","status":"SUCCEEDED","updated":"2026-05-09T14:19:57.282385Z"}}', '{"status":"success"}', 200, '2026-05-09 14:19:59.135162+00'),
(21, 'INV-20260509-EE4C25', '/api/checkout', NULL, '{"campaignId":1,"amount":500000,"donorName":"irvan","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":false,"doa":null,"paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":2,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-b03ed15d-b12e-408c-afac-1fdb6b5080f6","country":"ID","amount":500000,"currency":"IDR","business_id":"69ec806f841dd3809d3414b3","reference_id":"INV-20260509-EE4C25","payment_method":{"id":"pm-76e6c2f3-3d12-4224-b541-d39f1592d830","type":"EWALLET","reference_id":"0946a0f7-f3b0-443d-a723-0c8b19c5488b","description":null,"created":"2026-05-09T14:21:32.25426422Z","updated":"2026-05-09T14:21:32.25426422Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260509-EE4C25"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260509-EE4C25"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-09T14:21:32.323152751Z","updated":"2026-05-09T14:21:32.323152751Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk5r2bq21c73amtqi0","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260509-EE4C25","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk5r2bq21c73amtqi0","va_number":null}}}', 200, '2026-05-09 14:21:33.54246+00'),
(22, 'INV-20260509-EE4C25', '/api/webhooks/xendit:payment.succeeded', NULL, '{"created":"2026-05-09T14:21:39.576Z","business_id":"69ec806f841dd3809d3414b3","event":"payment.succeeded","api_version":null,"data":{"amount":500000,"channel_properties":null,"country":"ID","created":"2026-05-09T14:21:32.376834Z","currency":"IDR","customer_id":null,"description":null,"failure_code":null,"id":"ewc_f170ed01-4495-45fa-89e0-241e85017d16","items":null,"metadata":{"invoice_code":"INV-20260509-EE4C25"},"payment_detail":null,"payment_method":{"billing_information":{"city":null,"country":"","postal_code":null,"province_state":null,"street_line1":null,"street_line2":null},"card":null,"created":"2026-05-09T14:21:32.254264Z","description":null,"direct_bank_transfer":null,"direct_debit":null,"ewallet":{"account":{"account_details":null,"balance":null,"name":null,"point_balance":null},"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"https://lenteradonasi.vercel.app/status/INV-20260509-EE4C25"}},"id":"pm-76e6c2f3-3d12-4224-b541-d39f1592d830","metadata":null,"over_the_counter":null,"qr_code":null,"reference_id":"0946a0f7-f3b0-443d-a723-0c8b19c5488b","reusability":"ONE_TIME_USE","status":"EXPIRED","type":"EWALLET","updated":"2026-05-09T14:21:39.555529Z","virtual_account":null},"payment_request_id":"pr-b03ed15d-b12e-408c-afac-1fdb6b5080f6","reference_id":"INV-20260509-EE4C25","status":"SUCCEEDED","updated":"2026-05-09T14:21:39.227088Z"}}', '{"status":"success"}', 200, '2026-05-09 14:21:40.675572+00'),
(23, 'INV-20260509-3D5FA8', '/api/checkout', NULL, '{"campaignId":1,"amount":500000,"donorName":"M. Irvan Adrian","donorEmail":"irvan@cnt.id","donorPhone":"081462206437","isAnonymous":true,"doa":"semangat","paymentMethodId":6,"paymentType":"SHOPEEPAY","qty":1,"qurbanNames":[],"affiliateId":2,"fbClickId":null,"fbBrowserId":null,"tiktokClickId":null,"googleClickId":null}', '{"payment_gateway_response":{"id":"pr-04c8a6a9-14b6-4eaa-ba1b-655ae2ba88be","country":"ID","amount":500000,"currency":"IDR","business_id":"620343b4c529b6a9a4547532","reference_id":"INV-20260509-3D5FA8","payment_method":{"id":"pm-6c1f903b-a612-4be4-b10d-dfb5f2936736","type":"EWALLET","reference_id":"bad4973f-71c8-477d-90fb-12af5f1b6f46","description":null,"created":"2026-05-09T14:28:12.552475711Z","updated":"2026-05-09T14:28:12.552475711Z","card":null,"ewallet":{"channel_code":"SHOPEEPAY","channel_properties":{"mobile_number":"+6281462206437","success_return_url":"http://localhost:3001/status/INV-20260509-3D5FA8"},"account":{"name":null,"account_details":null,"balance":null,"point_balance":null}},"direct_debit":null,"direct_bank_transfer":null,"over_the_counter":null,"virtual_account":null,"qr_code":null,"metadata":null,"billing_information":{"country":"","street_line1":null,"street_line2":null,"city":null,"province_state":null,"postal_code":null},"reusability":"ONE_TIME_USE","status":"ACTIVE"},"description":null,"metadata":{"invoice_code":"INV-20260509-3D5FA8"},"customer_id":null,"capture_method":"AUTOMATIC","initiator":null,"card_verification_results":null,"created":"2026-05-09T14:28:12.616061424Z","updated":"2026-05-09T14:28:12.616061424Z","status":"REQUIRES_ACTION","actions":[{"action":"AUTH","url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk8v2bq21c73amtql0","url_type":"DEEPLINK","method":"GET","qr_code":null},{"action":"PRESENT_TO_CUSTOMER","url":null,"url_type":null,"method":null,"qr_code":"test-qr-string"}],"failure_code":null,"channel_properties":null,"shipping_information":null,"items":null},"client_response":{"status":"success","message":"Checkout initialized","data":{"invoice_code":"INV-20260509-3D5FA8","payment_url":"https://ewallet-mock-connector.xendit.co/v1/ewallet_connector/checkouts?token=d7vk8v2bq21c73amtql0","va_number":null}}}', 200, '2026-05-09 14:28:13.009651+00');

INSERT INTO "public"."notification_templates" ("id", "event_trigger", "channel", "message_content", "is_active") VALUES
(1, 'DONATION_SUCCESS', 'WHATSAPP', 'Terima kasih {nama}, donasi Rp {nominal} via {metode} berhasil kami terima. Semoga membawa keberkahan.', 't'),
(2, 'INVOICE_PENDING', 'WHATSAPP', 'Halo {nama}, tagihan donasi Rp {nominal} menunggu pembayaran. Silakan transfer ke {metode} berikut: {va_number} sebelum kedaluwarsa.', 't');

INSERT INTO "public"."notification_logs" ("id", "template_id", "invoice_code", "recipient", "channel", "request_payload", "response_payload", "status", "created_at") VALUES
(1, 1, 'TRX-9921', '08123456789', 'WHATSAPP', '{"target": "08123456789", "message": "Terima kasih Andi Dermawan, donasi Rp 100.000 via GoPay berhasil kami terima. Semoga membawa keberkahan.", "countryCode": "62"}', '{"status": true, "detail": "message sent successfully", "process": "1 messages sent"}', 'SUCCESS', '2026-05-01 03:32:23.084429+00'),
(2, 2, 'TRX-9922', '08123456789', 'WHATSAPP', '{"target": "08123456789", "message": "Halo Hamba Allah, tagihan donasi Rp 504.000 menunggu pembayaran. Silakan transfer ke BCA Virtual Account berikut: 807708123456789 sebelum kedaluwarsa.", "countryCode": "62"}', '{"status": true, "detail": "message sent successfully"}', 'SUCCESS', '2026-05-01 03:32:23.084429+00'),
(3, 1, 'INV-20260501-F056DE', '089613727205', 'WHATSAPP', '{"target":"089613727205","message":"Terima kasih eva, donasi Rp Rp 200.000 via DANA berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":467910143,"status":false}', 'FAILED', '2026-05-01 07:12:14.839995+00'),
(4, 1, 'INV-20260501-325C38', '089613727205', 'WHATSAPP', '{"target":"089613727205","message":"Terima kasih eva, donasi Rp Rp 200.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":467930267,"status":false}', 'FAILED', '2026-05-01 07:36:06.662446+00'),
(5, 1, 'INV-20260502-D396FD', '6281462206437', 'WHATSAPP', '{"target":"6281462206437","message":"Terima kasih irvan, donasi Rp Rp 50.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":468733439,"status":false}', 'FAILED', '2026-05-02 02:01:56.343371+00'),
(6, 1, 'INV-20260502-49B97B', '6281462206437', 'WHATSAPP', '{"target":"6281462206437","message":"Terima kasih irvan, donasi Rp Rp 2.500.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":468735687,"status":false}', 'FAILED', '2026-05-02 02:04:23.561435+00'),
(7, 1, 'INV-20260503-7127D7', '081462206437', 'WHATSAPP', '{"target":"081462206437","message":"Terima kasih irvan, donasi Rp Rp 500.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":469813137,"status":false}', 'FAILED', '2026-05-03 03:34:53.666545+00'),
(8, 1, 'INV-20260509-2E9F8C', '081462206437', 'WHATSAPP', '{"target":"081462206437","message":"Terima kasih irvan, donasi Rp Rp 35.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":479367398,"status":false}', 'FAILED', '2026-05-09 14:20:02.735193+00'),
(9, 1, 'INV-20260509-EE4C25', '081462206437', 'WHATSAPP', '{"target":"081462206437","message":"Terima kasih irvan, donasi Rp Rp 500.000 via ShopeePay berhasil kami terima. Semoga membawa keberkahan.","countryCode":"62"}', '{"reason":"request invalid on disconnected device","requestid":479369619,"status":false}', 'FAILED', '2026-05-09 14:21:45.818715+00');

INSERT INTO "public"."ads_conversion_logs" ("id", "invoice_code", "platform", "event_name", "request_payload", "response_payload", "http_status", "status", "created_at") VALUES
(1, 'TRX-9921', 'META_CAPI', 'Purchase', '{"data": [{"event_name": "Purchase", "event_time": 1791786600, "action_source": "website", "user_data": {"em": "78...hash...", "ph": "08...hash...", "client_ip_address": "192.168.1.1", "client_user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)", "fbc": "fb.1.123abc456"}, "custom_data": {"currency": "IDR", "value": 100000}}]}', '{"events_received": 1, "messages": [], "fbtrace_id": "Cabc123xyz"}', 200, 'SUCCESS', '2026-05-01 03:32:23.084429+00'),
(2, 'TRX-9923', 'TIKTOK_EVENTS_API', 'CompletePayment', '{"event": "CompletePayment", "event_time": 1791792900, "user": {"ttclid": "tiktok.abc.123", "ip": "114.120.10.15", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "phone": "08567890123"}, "properties": {"currency": "IDR", "value": 21000000}}', '{"code": 0, "message": "OK", "data": {"trace_id": "tt_trace_123456"}}', 200, 'SUCCESS', '2026-05-01 03:32:23.084429+00');



-- Indices
CREATE INDEX transaction_qurban_names_y2026m04_transaction_id_idx ON public.transaction_qurban_names_y2026m04 USING btree (transaction_id);
ALTER TABLE "public"."invoices_y2026m05" ADD FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."invoices_y2026m05" ADD FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;


-- Indices
CREATE UNIQUE INDEX invoices_y2026m05_invoice_code_created_at_key ON public.invoices_y2026m05 USING btree (invoice_code, created_at);
CREATE INDEX invoices_y2026m05_created_at_idx ON public.invoices_y2026m05 USING btree (created_at);
CREATE INDEX invoices_y2026m05_status_idx ON public.invoices_y2026m05 USING btree (status);
CREATE INDEX invoices_y2026m05_donor_id_idx ON public.invoices_y2026m05 USING btree (donor_id);
ALTER TABLE "public"."transactions_y2026m05" ADD FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions_y2026m05" ADD FOREIGN KEY ("bundle_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions_y2026m05" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."transactions_y2026m05" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions_y2026m05" ADD FOREIGN KEY ("invoice_id","invoice_created_at") REFERENCES "public"."invoices"("id","created_at") ON DELETE CASCADE;


-- Indices
CREATE INDEX transactions_y2026m05_campaign_id_idx ON public.transactions_y2026m05 USING btree (campaign_id);
CREATE INDEX transactions_y2026m05_created_at_idx ON public.transactions_y2026m05 USING btree (created_at);
CREATE INDEX transactions_y2026m05_invoice_id_idx ON public.transactions_y2026m05 USING btree (invoice_id);
CREATE INDEX transactions_y2026m05_affiliate_id_idx ON public.transactions_y2026m05 USING btree (affiliate_id);


-- Indices
CREATE UNIQUE INDEX admins_email_key ON public.admins USING btree (email);
ALTER TABLE "public"."campaigns" ADD FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;


-- Indices
CREATE UNIQUE INDEX campaigns_slug_key ON public.campaigns USING btree (slug);
CREATE INDEX idx_campaigns_category ON public.campaigns USING btree (category_id);
CREATE INDEX idx_campaigns_status_created ON public.campaigns USING btree (status, created_at DESC);
CREATE INDEX idx_campaigns_urgent ON public.campaigns USING btree (is_urgent) WHERE (is_urgent = true);
ALTER TABLE "public"."campaign_qris_static" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;


-- Indices
CREATE UNIQUE INDEX campaign_qris_static_external_id_key ON public.campaign_qris_static USING btree (external_id);
CREATE INDEX idx_campaign_qris_campaign ON public.campaign_qris_static USING btree (campaign_id);
ALTER TABLE "public"."campaign_bundles" ADD FOREIGN KEY ("bundle_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;
ALTER TABLE "public"."campaign_bundles" ADD FOREIGN KEY ("item_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_campaign_bundles_bundle ON public.campaign_bundles USING btree (bundle_campaign_id);
ALTER TABLE "public"."campaign_variants" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_campaign_variants_campaign ON public.campaign_variants USING btree (campaign_id);
ALTER TABLE "public"."campaign_stats" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;
ALTER TABLE "public"."campaign_updates" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_campaign_updates_campaign ON public.campaign_updates USING btree (campaign_id, created_at DESC);


-- Indices
CREATE UNIQUE INDEX affiliates_affiliate_code_key ON public.affiliates USING btree (affiliate_code);
CREATE UNIQUE INDEX affiliates_email_key ON public.affiliates USING btree (email);
ALTER TABLE "public"."affiliate_commissions" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;
ALTER TABLE "public"."affiliate_commissions" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;
ALTER TABLE "public"."affiliate_campaign_stats" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;
ALTER TABLE "public"."affiliate_campaign_stats" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;
ALTER TABLE "public"."withdrawals" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id");


-- Indices
CREATE INDEX idx_withdrawals_affiliate ON public.withdrawals USING btree (affiliate_id);
ALTER TABLE "public"."payment_instructions" ADD FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_donors_email ON public.donors USING btree (email);
ALTER TABLE "public"."invoices" ADD FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;
ALTER TABLE "public"."invoices" ADD FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;


-- Indices
CREATE UNIQUE INDEX invoices_invoice_code_created_at_key ON ONLY public.invoices USING btree (invoice_code, created_at);
CREATE INDEX idx_invoices_created_at ON ONLY public.invoices USING btree (created_at);
CREATE INDEX idx_invoices_status ON ONLY public.invoices USING btree (status);
CREATE INDEX idx_invoices_donor ON ONLY public.invoices USING btree (donor_id);
ALTER TABLE "public"."invoices_y2026m10" ADD FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;
ALTER TABLE "public"."invoices_y2026m10" ADD FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;


-- Indices
CREATE UNIQUE INDEX invoices_y2026m10_invoice_code_created_at_key ON public.invoices_y2026m10 USING btree (invoice_code, created_at);
CREATE INDEX invoices_y2026m10_created_at_idx ON public.invoices_y2026m10 USING btree (created_at);
CREATE INDEX invoices_y2026m10_status_idx ON public.invoices_y2026m10 USING btree (status);
CREATE INDEX invoices_y2026m10_donor_id_idx ON public.invoices_y2026m10 USING btree (donor_id);
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("invoice_id","invoice_created_at") REFERENCES "public"."invoices_y2026m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("invoice_id","invoice_created_at") REFERENCES "public"."invoices"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("bundle_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("invoice_id","invoice_created_at") REFERENCES "public"."invoices_y2026m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions" ADD FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE SET NULL;


-- Indices
CREATE INDEX idx_transactions_campaign ON ONLY public.transactions USING btree (campaign_id);
CREATE INDEX idx_transactions_created_at ON ONLY public.transactions USING btree (created_at);
CREATE INDEX idx_transactions_invoice ON ONLY public.transactions USING btree (invoice_id);
CREATE INDEX idx_transactions_affiliate ON ONLY public.transactions USING btree (affiliate_id);
ALTER TABLE "public"."transactions_y2026m10" ADD FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions_y2026m10" ADD FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."transactions_y2026m10" ADD FOREIGN KEY ("invoice_id","invoice_created_at") REFERENCES "public"."invoices"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transactions_y2026m10" ADD FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE SET NULL;
ALTER TABLE "public"."transactions_y2026m10" ADD FOREIGN KEY ("bundle_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;


-- Indices
CREATE INDEX transactions_y2026m10_campaign_id_idx ON public.transactions_y2026m10 USING btree (campaign_id);
CREATE INDEX transactions_y2026m10_created_at_idx ON public.transactions_y2026m10 USING btree (created_at);
CREATE INDEX transactions_y2026m10_invoice_id_idx ON public.transactions_y2026m10 USING btree (invoice_id);
CREATE INDEX transactions_y2026m10_affiliate_id_idx ON public.transactions_y2026m10 USING btree (affiliate_id);


-- Indices
CREATE INDEX transaction_qurban_names_y2026m05_transaction_id_idx ON public.transaction_qurban_names_y2026m05 USING btree (transaction_id);
ALTER TABLE "public"."transaction_qurban_names" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."transactions"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transaction_qurban_names" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."transactions_y2026m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."transaction_qurban_names" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."transactions_y2026m05"("id","created_at") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_transaction_qurban_trx ON public.transaction_qurban_names USING btree (transaction_id);


-- Indices
CREATE INDEX idx_payment_logs_invoice ON public.payment_logs USING btree (invoice_code);


-- Indices
CREATE UNIQUE INDEX notification_templates_event_trigger_key ON public.notification_templates USING btree (event_trigger);
ALTER TABLE "public"."notification_logs" ADD FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE SET NULL;


-- Indices
CREATE INDEX idx_notification_logs_template ON public.notification_logs USING btree (template_id);
CREATE INDEX idx_notification_logs_invoice ON public.notification_logs USING btree (invoice_code);


-- Indices
CREATE INDEX idx_ads_conversion_logs_invoice ON public.ads_conversion_logs USING btree (invoice_code);

-- Tabel pixel_events untuk mapping dinamis dari screen/halaman ke event Meta, TikTok, dan Google Ads
CREATE TABLE IF NOT EXISTS public.pixel_events (
    id SERIAL PRIMARY KEY,
    screen_name VARCHAR(100) UNIQUE NOT NULL,
    meta_event VARCHAR(100),
    tiktok_event VARCHAR(100),
    google_event VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert seed data default untuk pixel events
INSERT INTO public.pixel_events (screen_name, meta_event, tiktok_event, google_event, is_active) VALUES
('page_view', 'PageView', 'PageView', 'page_view', true),
('checkout_amount', 'ViewContent', 'ViewContent', 'view_item', true),
('checkout_profile', 'InitiateCheckout', 'InitiateCheckout', 'begin_checkout', true),
('checkout_payment', 'AddPaymentInfo', 'AddPaymentInfo', 'add_payment_info', true),
('purchase_success', 'Purchase', 'CompletePayment', 'purchase', true)
ON CONFLICT (screen_name) DO UPDATE SET
  meta_event = EXCLUDED.meta_event,
  tiktok_event = EXCLUDED.tiktok_event,
  google_event = EXCLUDED.google_event,
  is_active = EXCLUDED.is_active;
