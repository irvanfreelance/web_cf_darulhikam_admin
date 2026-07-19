-- =================================================================================
-- DATABASE SCHEMA: SINGLE-TENANT WITH TABLE PARTITIONING (HIGH-TRAFFIC READY)
-- DBMS: PostgreSQL (Neon)
-- Konsep: Dedicated Database per Yayasan, Invoices & Transactions dipartisi per Bulan.
-- Full Features: Zakat, Qurban, Bundling, Affiliate, Ads Tracking, QRIS Statis
-- =================================================================================

-- 0. CLEANUP (FOR SEEDING)
DROP TABLE IF EXISTS ads_conversion_logs CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS payment_logs CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS transaction_qurban_names CASCADE;
DROP TABLE IF EXISTS transactions_y2026m10 CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS invoices_y2026m10 CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payment_instructions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS affiliate_campaign_stats CASCADE;
DROP TABLE IF EXISTS affiliate_commissions CASCADE;
DROP TABLE IF EXISTS affiliates CASCADE;
DROP TABLE IF EXISTS campaign_updates CASCADE;
DROP TABLE IF EXISTS campaign_stats CASCADE;
DROP TABLE IF EXISTS campaign_variants CASCADE;
DROP TABLE IF EXISTS campaign_bundles CASCADE;
DROP TABLE IF EXISTS campaign_qris_static CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS ngo_configs CASCADE;

-- 1. KONFIGURASI GLOBAL & MANAJEMEN USER (ADMIN)
CREATE TABLE ngo_configs (
    id BIGSERIAL PRIMARY KEY,
    ngo_name VARCHAR(150) NOT NULL,
    logo_url VARCHAR(255),
    short_description TEXT,
    address TEXT,
    legal_info TEXT,
    primary_color VARCHAR(20) DEFAULT '#1086b1',
    whatsapp_number VARCHAR(20),
    instagram_url VARCHAR(255),
    facebook_url VARCHAR(255),
    favicon_url VARCHAR(255),
    
    -- Konfigurasi Integrasi Ads Tracking (Meta, Google, TikTok)
    meta_pixel_id VARCHAR(50),
    meta_capi_token TEXT,
    google_ads_id VARCHAR(50), 
    google_developer_token VARCHAR(255), 
    tiktok_pixel_id VARCHAR(50),
    tiktok_events_api_token TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'SUPERADMIN',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. KATEGORI & KAMPANYE UTAMA
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color_theme VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url VARCHAR(255),
    description TEXT,
    
    -- Status Visual Kampanye (UI Badges)
    is_verified BOOLEAN DEFAULT TRUE,
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- Konfigurasi Nominasi & Opsi
    minimum_amount BIGINT DEFAULT 10000,
    suggestion_amounts BIGINT[] DEFAULT ARRAY[10000, 25000, 50000, 100000, 200000, 500000],
    
    -- Konfigurasi Tipe Kampanye (Semua Use Case)
    is_zakat BOOLEAN DEFAULT FALSE,
    is_qurban BOOLEAN DEFAULT FALSE,
    is_fixed_amount BOOLEAN DEFAULT FALSE,
    is_bundle BOOLEAN DEFAULT FALSE,
    has_no_target BOOLEAN DEFAULT FALSE,
    has_no_time_limit BOOLEAN DEFAULT FALSE,
    sort INT DEFAULT 0,
    
    -- Batasan (Bisa NULL jika has_no_target / has_no_time_limit TRUE)
    target_amount BIGINT, 
    end_date TIMESTAMPTZ,
    
    -- Pengaturan Affiliate Default
    base_commission_pct DECIMAL(5,2) DEFAULT 0.00,
    
    status VARCHAR(20) DEFAULT 'ACTIVE', 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ekosistem Fitur Baru: QRIS First / QRIS Statis Event Offline
CREATE TABLE campaign_qris_static (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    external_id VARCHAR(100) UNIQUE NOT NULL, -- Didaftarkan ke Payment Gateway
    qris_string TEXT NOT NULL,                -- Raw QR String untuk dirender di Kanvas/Banner
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Relasi Bundling
CREATE TABLE campaign_bundles (
    bundle_campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    qty SMALLINT DEFAULT 1,
    PRIMARY KEY (bundle_campaign_id, item_campaign_id)
);

-- Varian Paket / Qurban
CREATE TABLE campaign_variants (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, 
    price BIGINT NOT NULL,
    names_per_qty SMALLINT DEFAULT 1, 
    stock_limit INT DEFAULT NULL, 
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabel Terpisah untuk Statistik Kampanye (Pemisahan High RPS Write)
CREATE TABLE campaign_stats (
    campaign_id BIGINT PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    collected_amount BIGINT DEFAULT 0,
    donor_count INT DEFAULT 0,
    package_sold INT DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Kabar Terbaru (News/Updates)
CREATE TABLE campaign_updates (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. AFILIASI / FUNDRAISER
CREATE TABLE affiliates (
    id BIGSERIAL PRIMARY KEY,
    affiliate_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    balance BIGINT DEFAULT 0, 
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE affiliate_commissions (
    affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    commission_type VARCHAR(20) DEFAULT 'PERCENTAGE', 
    commission_value DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (affiliate_id, campaign_id)
);

CREATE TABLE affiliate_campaign_stats (
    affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    click_count INT DEFAULT 0,
    converted_donors INT DEFAULT 0,
    raised_amount BIGINT DEFAULT 0,
    commission_earned BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (affiliate_id, campaign_id)
);

CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id BIGINT NOT NULL REFERENCES affiliates(id),
    amount BIGINT NOT NULL,
    bank_account_info VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

-- 4. DONATUR & PAYMENT METHODS
CREATE TABLE donors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    is_anonymous_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_methods (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    type VARCHAR(50) NOT NULL, 
    provider VARCHAR(50) NOT NULL, 
    admin_fee_flat BIGINT DEFAULT 0,
    admin_fee_pct DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    is_redirect BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0
);

CREATE TABLE payment_instructions (
    id BIGSERIAL PRIMARY KEY,
    payment_method_id BIGINT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- 🌟 TABEL PARTISI: INVOICES (Induk Transaksi)
-- =================================================================================
CREATE TABLE invoices (
    id BIGSERIAL,
    invoice_code VARCHAR(50) NOT NULL,
    donor_id BIGINT REFERENCES donors(id) ON DELETE SET NULL,
    payment_method_id BIGINT NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    
    donor_name_snapshot VARCHAR(150) NOT NULL,
    donor_email VARCHAR(150),
    donor_phone VARCHAR(20),
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    base_amount BIGINT NOT NULL,
    admin_fee BIGINT DEFAULT 0,
    total_amount BIGINT NOT NULL,
    unique_code INT DEFAULT 0,
    
    fb_click_id VARCHAR(255),      
    fb_browser_id VARCHAR(255),    
    tiktok_click_id VARCHAR(255),  
    google_click_id VARCHAR(255),  
    client_ip_address VARCHAR(45), 
    client_user_agent TEXT,        
    
    status VARCHAR(20) DEFAULT 'PENDING',
    va_number VARCHAR(50),
    payment_url TEXT,
    qris_dynamic TEXT,
    xendit_payment_request_id VARCHAR(255),
    doa TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ,
    is_wa_checkout_sent BOOLEAN DEFAULT FALSE,
    is_wa_paid_sent BOOLEAN DEFAULT FALSE,
    is_email_checkout_sent BOOLEAN DEFAULT FALSE,
    is_email_paid_sent BOOLEAN DEFAULT FALSE,
    is_ads_sent BOOLEAN DEFAULT FALSE,
    
    -- WAJIB: Kolom partisi (created_at) harus masuk ke Primary Key & Unique Key
    PRIMARY KEY (id, created_at),
    UNIQUE (invoice_code, created_at)
) PARTITION BY RANGE (created_at);

-- =================================================================================
-- 🌟 TABEL PARTISI: TRANSACTIONS (Rincian per Kampanye)
-- =================================================================================
CREATE TABLE transactions (
    id BIGSERIAL,
    invoice_id BIGINT NOT NULL,
    invoice_created_at TIMESTAMPTZ NOT NULL, 
    
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    bundle_campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
    variant_id BIGINT REFERENCES campaign_variants(id) ON DELETE SET NULL,
    affiliate_id BIGINT REFERENCES affiliates(id) ON DELETE SET NULL,
    
    qty SMALLINT DEFAULT 1,
    amount BIGINT NOT NULL, 
    affiliate_commission BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_at),
    FOREIGN KEY (invoice_id, invoice_created_at) REFERENCES invoices(id, created_at) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- Partisi Aktif untuk SEED DATA (Oktober 2026)
CREATE TABLE invoices_y2026m10 PARTITION OF invoices FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE transactions_y2026m10 PARTITION OF transactions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_transactions_campaign ON transactions(campaign_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);


-- Tabel Qurban
CREATE TABLE transaction_qurban_names (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    transaction_created_at TIMESTAMPTZ NOT NULL,
    mudhohi_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id, transaction_created_at) REFERENCES transactions(id, created_at) ON DELETE CASCADE
);

-- 5. NOTIFIKASI & LOGGING
CREATE TABLE notification_templates (
    id BIGSERIAL PRIMARY KEY,
    event_trigger VARCHAR(50) UNIQUE NOT NULL, 
    channel VARCHAR(20) NOT NULL, 
    message_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE payment_logs (
    id BIGSERIAL PRIMARY KEY,
    invoice_code VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    type VARCHAR(50),
    request_payload TEXT,
    response_payload TEXT,
    http_status INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT REFERENCES notification_templates(id) ON DELETE SET NULL,
    invoice_code VARCHAR(50),
    recipient VARCHAR(150) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    request_payload TEXT,
    response_payload TEXT,
    status VARCHAR(20), 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ads_conversion_logs (
    id BIGSERIAL PRIMARY KEY,
    invoice_code VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NOT NULL, 
    event_name VARCHAR(100) NOT NULL, 
    request_payload TEXT,
    response_payload TEXT,
    http_status INT,
    status VARCHAR(20), 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- ADVANCED INDEX OPTIMIZATION (UNTUK KINERJA READ/WRITE TINGGI DI ATAS 10K RPS)
-- Ditambahkan untuk mempercepat JOIN Queries & Filtering yang sering digunakan
-- =================================================================================

-- 1. Index Pencarian & Filtering (Frontend & Admin)
CREATE INDEX idx_campaigns_category ON campaigns(category_id);
CREATE INDEX idx_campaigns_status_created ON campaigns(status, created_at DESC);
CREATE INDEX idx_campaigns_urgent ON campaigns(is_urgent) WHERE is_urgent = TRUE;
CREATE INDEX idx_donors_email ON donors(email);

-- 2. Index Relasi & Join (Mencegah Full Table Scan)
CREATE INDEX idx_campaign_updates_campaign ON campaign_updates(campaign_id, created_at DESC);
CREATE INDEX idx_campaign_variants_campaign ON campaign_variants(campaign_id);
CREATE INDEX idx_campaign_bundles_bundle ON campaign_bundles(bundle_campaign_id);
CREATE INDEX idx_campaign_qris_campaign ON campaign_qris_static(campaign_id);

-- 3. Index Dashboard Donatur & Affiliate
CREATE INDEX idx_invoices_donor ON invoices(donor_id);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_affiliate ON transactions(affiliate_id);
CREATE INDEX idx_transaction_qurban_trx ON transaction_qurban_names(transaction_id);
CREATE INDEX idx_withdrawals_affiliate ON withdrawals(affiliate_id);

-- 4. Index Observability & Webhooks (Background Jobs)
CREATE INDEX idx_payment_logs_invoice ON payment_logs(invoice_code);
CREATE INDEX idx_ads_conversion_logs_invoice ON ads_conversion_logs(invoice_code);
CREATE INDEX idx_notification_logs_template ON notification_logs(template_id);
CREATE INDEX idx_notification_logs_invoice ON notification_logs(invoice_code);

-- =================================================================================
-- SEED DATA (IDENTIK 100% DENGAN CANVAS REACT FRONTEND & ADMIN)
-- =================================================================================

-- 1. Konfigurasi
INSERT INTO ngo_configs (id, ngo_name, logo_url, short_description, address, legal_info, primary_color, whatsapp_number, instagram_url, facebook_url, meta_pixel_id, meta_capi_token, google_ads_id, google_developer_token, tiktok_pixel_id, tiktok_events_api_token, favicon_url, updated_at) VALUES 
(1, 'Yayasan Peduli Sesama', NULL, 'Lembaga filantropi independen yang berdedikasi untuk menyalurkan kebaikan donatur secara transparan, profesional, dan tepat sasaran.', 'Jl. Kebaikan Bangsa No. 99, Gedung Amal Lt. 2, Jakarta Selatan, DKI Jakarta 12345', 'Resmi terdaftar dengan SK Kemenkumham RI No. AHU-00123.AH.01.04.Tahun 2026', '#1086b1', '6281234567890', NULL, NULL, '123456789012345', NULL, NULL, NULL, 'CD12345TIKTOKPIXEL', NULL, NULL, '2026-04-19 01:39:51.048594+00');

INSERT INTO admins (id, name, email, password_hash, role, status, created_at) VALUES 
(1, 'Ahmad Fulan', 'ahmad@ngo.org', '$2a$12$Dummy', 'SUPERADMIN', 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(2, 'Rina Keuangan', 'rina@ngo.org', '$2a$12$Dummy', 'FINANCE', 'ACTIVE', '2026-04-19 01:39:51.048594+00');

-- 2. Kategori
INSERT INTO categories (id, name, color_theme) VALUES 
(1, 'Medis', 'rose'), (2, 'Pendidikan', 'blue'), (3, 'Bencana', 'orange'), 
(4, 'Panti Asuhan', 'teal'), (5, 'Zakat', 'emerald'), (6, 'Qurban', 'amber'), 
(7, 'Infaq', 'indigo'), (8, 'Pembangunan', 'slate');

-- 3. Kampanye (Identik dengan array `campaigns` di DonasiApp.jsx)
INSERT INTO campaigns (id, category_id, title, slug, image_url, description, is_verified, is_urgent, is_fixed_amount, is_bundle, is_qurban, is_zakat, has_no_target, has_no_time_limit, target_amount, end_date) VALUES
(1, 1, 'Bantu Adik Rina Sembuh dari Gagal Ginjal', 'bantu-adik-rina', 'https://images.pexels.com/photos/3845125/pexels-photo-3845125.jpeg', 'Adik Rina (8 tahun) saat ini sedang berjuang...', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 150000000, '2026-10-24 23:59:59'),
(2, 2, 'Pembangunan Sekolah Darurat di Pelosok NTT', 'sekolah-ntt', 'https://images.pexels.com/photos/8613322/pexels-photo-8613322.jpeg', 'Ratusan anak di desa terpencil NTT...', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 300000000, '2026-11-26 23:59:59'),
(3, 3, 'Bantuan Pangan Korban Banjir Bandang', 'banjir-bandang', 'https://images.pexels.com/photos/6994992/pexels-photo-6994992.jpeg', 'Banjir bandang telah menyapu bersih...', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 50000000, '2026-10-15 23:59:59'),
(4, 4, 'Sedekah Paket Berbuka Puasa untuk Pejuang Jalanan', 'paket-berbuka', 'https://images.pexels.com/photos/6995201/pexels-photo-6995201.jpeg', 'Banyak saudara kita yang berpuasa...', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 70000000, '2026-11-01 23:59:59'),
(5, 5, 'Tunaikan Zakat Profesi & Maal Anda', 'zakat', 'https://images.pexels.com/photos/4968636/pexels-photo-4968636.jpeg', 'Sucikan harta Anda dengan menunaikan zakat.', TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, 500000000, '2027-10-12 23:59:59'),
(6, 6, 'Qurban Pedalaman: Kambing Standar', 'qurban-kambing', 'https://images.pexels.com/photos/5698305/pexels-photo-5698305.jpeg', 'Qurban kambing (berat 23-25 kg)...', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 200000000, '2026-11-26 23:59:59'),
(7, 6, 'Qurban Pedalaman: Patungan 1/7 Sapi', 'patungan-sapi', 'https://images.pexels.com/photos/422218/pexels-photo-422218.jpeg', 'Ikut patungan 1/7 bagian sapi qurban.', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 315000000, '2026-11-26 23:59:59'),
(8, 6, 'Qurban Pedalaman: 1 Ekor Sapi Utuh', 'qurban-sapi', 'https://images.pexels.com/photos/16399151/pexels-photo-16399151.jpeg', 'Tunaikan qurban 1 ekor sapi utuh...', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 420000000, '2026-11-26 23:59:59'),
(9, 7, 'Infaq Operasional & Pengembangan Dakwah', 'infaq', 'https://images.pexels.com/photos/1310102/pexels-photo-1310102.jpeg', 'Salurkan infaq terbaik Anda untuk mendukung...', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, NULL, NULL),
(10, 4, 'Paket Basmalah (5 Buka Puasa + 8 Kado Yatim)', 'paket-basmalah', 'https://images.pexels.com/photos/9127752/pexels-photo-9127752.jpeg', 'Maksimalkan pahala Anda dengan program Bundling...', TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, 500000000, '2026-11-06 23:59:59'),
(11, 8, 'Pembangunan Masjid Al-Ikhlas', 'masjid-alikhlas', 'https://images.pexels.com/photos/1310102/pexels-photo-1310102.jpeg', 'Pembangunan Masjid...', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1000000000, '2027-10-12 23:59:59'),
(12, 4, 'Kado Lebaran Yatim', 'kado-yatim', '', 'Hidden campaign for bundle item', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL);

-- Ekosistem Fitur Baru: QRIS First / QRIS Statis Event Offline (Seed)
INSERT INTO campaign_qris_static (id, campaign_id, external_id, qris_string, status) VALUES
(1, 9, 'QRIS-INFAQ-STATIC-001', '00020101021226660014ID.CO.QRIS.WWW01189360091530000020215ID102002131920315ID102002131925204481053033605802ID5902ID6015BANDUNG SELATAN61054023262070703A0163046C49', 'ACTIVE'),
(2, 11, 'QRIS-MASJID-STATIC-002', '00020101021226660014ID.CO.QRIS.WWW01189360091530000020215ID102002131920315ID102002131925204481053033605802ID5902ID6015BANDUNG SELATAN61054023262070703A0163046C49', 'ACTIVE');

-- Varian Produk Kampanye (Untuk Harga Paket/Qurban)
INSERT INTO campaign_variants (campaign_id, name, price, names_per_qty) VALUES
(4, 'Paket Berbuka', 35000, 1),
(6, 'Ekor Kambing', 2500000, 1),
(7, 'Bagian Sapi (1/7)', 3000000, 1),
(8, 'Ekor Sapi', 21000000, 7),
(10, 'Paket Basmalah', 415000, 1),
(12, 'Paket Kado Yatim', 30000, 1);

-- Mapping Bundling (Paket Basmalah 415k = 5x Buka Puasa (175k) + 8x Kado Yatim (240k))
INSERT INTO campaign_bundles (bundle_campaign_id, item_campaign_id, qty) VALUES
(10, 4, 5),
(10, 12, 8);

-- Statistik Kampanye 
INSERT INTO campaign_stats (campaign_id, collected_amount, donor_count, views_count) VALUES
(1, 105000000, 1245, 12400),
(2, 85000000, 830, 0),
(3, 48000000, 2100, 0),
(4, 24500000, 700, 0),
(5, 125000000, 340, 8900),
(6, 45000000, 18, 0),
(7, 126000000, 42, 0),
(8, 63000000, 3, 4200),
(9, 15450000, 342, 15600),
(10, 83000000, 200, 0),
(11, 850000000, 1500, 25000),
(12, 0, 0, 0);

-- Update Laporan Penyaluran (Timeline)
INSERT INTO campaign_updates (campaign_id, title, excerpt, content, image_url, created_at) VALUES
(1, 'Penyaluran Tahap 1: Biaya Cuci Darah', 'Dana sebesar Rp 15.000.000 telah disalurkan untuk biaya cuci darah Dik Rina...', 'Terima kasih Orang Baik!\n\nDana sebesar Rp 15.000.000 telah disalurkan untuk biaya cuci darah Dik Rina selama 1 bulan ke depan. Kondisi Rina saat ini berangsur stabil namun masih membutuhkan perawatan intensif.\n\nDoakan Rina terus ya agar segera pulih sepenuhnya!', 'https://images.pexels.com/photos/2324837/pexels-photo-2324837.jpeg', '2026-10-15 10:00:00'),
(2, 'Peletakan Batu Pertama Dimulai!', 'Alhamdulillah, proses pembangunan sekolah darurat mulai berjalan dengan antusiasme warga...', 'Halo Kakak-kakak Baik!\n\nKabar gembira, berkat donasi Anda, peletakan batu pertama untuk sekolah darurat telah dilaksanakan. Warga sangat antusias bergotong royong membersihkan lahan.\n\nTerus dukung kami agar bangunan ini segera berdiri dan anak-anak bisa belajar dengan nyaman.', 'https://images.pexels.com/photos/11844555/pexels-photo-11844555.jpeg', '2026-10-10 10:00:00');

-- 4. Affiliate
INSERT INTO affiliates (id, affiliate_code, name, email, phone, password_hash, balance, status, created_at) VALUES
(1, 'AFF-992', 'Budi Marketer', 'budi.marketer@email.com', '08123456789', '$2a$12$Dummy', 1250000, 'ACTIVE', '2026-04-19 01:39:51.048594+00'),
(2, 'KOHDENIS', 'koh denis', 'irvan@cnt.id', '081462206437', '$2a$12$DummyGeneratedByAdmin', 0, 'ACTIVE', '2026-04-19 02:49:12.748093+00');

-- Pengaturan Spesifik Komisi Afiliasi
INSERT INTO affiliate_commissions (affiliate_id, campaign_id, commission_type, commission_value) VALUES
(1, 1, 'PERCENTAGE', 5.00),
(1, 5, 'PERCENTAGE', 2.00),
(1, 10, 'AMOUNT', 15000.00);

-- Statistik Afiliasi Per Kampanye
INSERT INTO affiliate_campaign_stats (affiliate_id, campaign_id, click_count, converted_donors, raised_amount, commission_earned) VALUES
(1, 1, 12450, 342, 25000000, 1250000);

-- Withdrawal (Pencairan Afiliasi)
INSERT INTO withdrawals (id, affiliate_id, amount, bank_account_info, status, processed_at) VALUES
(1, 1, 500000, 'BCA 123456789 a.n Budi Marketer', 'PROCESSED', '2026-10-01 10:00:00'),
(2, 1, 750000, 'GoPay 08123456789', 'PROCESSED', '2026-09-15 14:00:00');

-- 5. Donatur & Metode Pembayaran
INSERT INTO donors (id, name, email, phone) VALUES
(1, 'Andi Dermawan', 'andi@email.com', '08123456789'),
(2, 'Budi Santoso', 'budi.s@email.com', '08567890123'),
(3, 'Siti Aminah', 'siti@email.com', '08198765432');

INSERT INTO payment_methods (id, code, name, logo_url, type, provider, admin_fee_flat, is_redirect, sort_order) VALUES
(1, 'GOPAY', 'GoPay', 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg', 'E-Wallet', 'Midtrans', 0, FALSE, 1),
(2, 'BCAVA', 'BCA Virtual Account', 'https://upload.wikimedia.org/wikipedia/id/e/e0/BCA_logo.svg', 'Bank Transfer', 'Xendit', 4000, FALSE, 2),
(3, 'MANDIRIVA', 'Mandiri Virtual Account', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_of_Bank_Mandiri.svg', 'Bank Transfer', 'Xendit', 4000, FALSE, 3),
(4, 'BSIVA', 'BSI Virtual Account', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg', 'Bank Transfer', 'Xendit', 4000, FALSE, 4),
(5, 'QR_CODE', 'QRIS Dynamic', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg', 'qr_code', 'Xendit', 0, FALSE, 5),
(6, 'SHOPEEPAY', 'ShopeePay', 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg', 'E-Wallet', 'Xendit', 0, FALSE, 6),
(7, 'DANA', 'DANA', 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg', 'E-Wallet', 'Xendit', 0, FALSE, 7),
(8, 'LINKAJA', 'LinkAja', 'https://upload.wikimedia.org/wikipedia/commons/8/83/LinkAja.svg', 'E-Wallet', 'Xendit', 0, FALSE, 8);

-- Instruksi Pembayaran
INSERT INTO payment_instructions (id, payment_method_id, title, content, sort_order) VALUES
(1, 2, 'Pembayaran Pembayaran via m-BCA', '<ol><li>Buka aplikasi BCA Mobile dan login.</li><li>Pilih menu <strong>m-Transfer</strong> > <strong>BCA Virtual Account</strong>.</li><li>Masukkan nomor Virtual Account yang tertera di atas dan klik <strong>Send</strong>.</li></ol>', 1),
(2, 2, 'Pembayaran Pembayaran via ATM BCA', '<ol><li>Masukkan kartu ATM dan PIN Anda.</li><li>Pilih menu <strong>Transaksi Lainnya</strong> > <strong>Transfer</strong> > <strong>Ke Rek BCA Virtual Account</strong>.</li></ol>', 2),
(3, 1, 'Pembayaran dengan Aplikasi Gojek / GoPay', '<ol><li>Buka aplikasi Gojek atau dompet digital Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>', 1);

-- 6. Transaksi Partitioned (Bulan Oktober 2026)
INSERT INTO invoices (id, invoice_code, donor_id, payment_method_id, donor_name_snapshot, donor_email, donor_phone, is_anonymous, base_amount, admin_fee, total_amount, unique_code, status, va_number, created_at, paid_at, doa) VALUES
(1, 'TRX-9921', 1, 1, 'Andi Dermawan', NULL, NULL, FALSE, 100000, 0, 100000, 0, 'PAID', NULL, '2026-10-12 14:30:00+00', '2026-10-12 14:32:00+00', NULL),
(2, 'TRX-9922', NULL, 2, 'Hamba Allah', NULL, NULL, TRUE, 500000, 4000, 504000, 0, 'PENDING', NULL, '2026-10-12 15:10:00+00', NULL, NULL),
(3, 'TRX-9923', 2, 3, 'Budi Santoso', NULL, NULL, FALSE, 21000000, 4000, 21004000, 0, 'PAID', NULL, '2026-10-12 16:05:00+00', '2026-10-12 16:15:00+00', NULL),
(4, 'TRX-9924', 3, 4, 'Siti Aminah', NULL, NULL, FALSE, 5000000, 4000, 5004000, 0, 'PAID', NULL, '2026-10-11 09:15:00+00', '2026-10-11 09:20:00+00', NULL),
(5, 'INV-20261025-A001', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', FALSE, 150000, 4000, 154000, 0, 'PAID', '807708123456789', '2026-10-25 08:00:00+00', '2026-10-25 08:05:00+00', 'Semoga Adik Rina cepat sembuh dan bisa sekolah lagi, semangat terus ya dek!'),
(6, 'INV-20261025-A002', 2, 3, 'Budi Santoso', 'budi.s@email.com', '08567890123', FALSE, 250000, 4000, 254000, 0, 'PAID', '888808567890123', '2026-10-25 09:00:00+00', '2026-10-25 09:10:00+00', 'Semoga pembangunan sekolah di NTT lancar dan jadi amal jariyah untuk kita semua.'),
(7, 'INV-20261025-A003', NULL, 5, 'Hamba Allah', NULL, NULL, TRUE, 100000, 0, 100000, 0, 'PAID', NULL, '2026-10-25 10:00:00+00', '2026-10-25 10:02:00+00', 'Semoga saudara kita korban banjir diberi ketabahan dan kekuatan.'),
(8, 'INV-20261025-A004', 3, 1, 'Siti Aminah', 'siti@email.com', '08198765432', FALSE, 35000, 0, 35000, 0, 'PAID', NULL, '2026-10-25 11:00:00+00', '2026-10-25 11:05:00+00', 'Semoga nasi box ini berkah untuk yang menerima.'),
(9, 'INV-20261025-A005', 1, 2, 'Andi Dermawan', 'andi@email.com', '08123456789', FALSE, 1000000, 4000, 1004000, 0, 'PAID', '807708123456789', '2026-10-25 12:00:00+00', '2026-10-25 12:15:00+00', 'Zakat maal untuk membersihkan harta tahun ini.'),
(10, 'INV-20261025-A006', 2, 5, 'Budi Santoso', 'budi.s@email.com', '08567890123', FALSE, 2500000, 0, 2500000, 0, 'PAID', NULL, '2026-10-25 13:00:00+00', '2026-10-25 13:10:00+00', 'Bismillah, qurban kambing atas nama Bapak Budi Santoso.'),
(11, 'INV-20261025-A007', 3, 5, 'Siti Aminah', 'siti@email.com', '08198765432', FALSE, 3000000, 0, 3000000, 0, 'PAID', NULL, '2026-10-25 14:00:00+00', '2026-10-25 14:10:00+00', 'Patungan qurban sapi, semoga bermanfaat untuk warga pedalaman.'),
(12, 'INV-20261025-A008', NULL, 5, 'Anonim', NULL, NULL, TRUE, 21000000, 0, 21000000, 0, 'PAID', NULL, '2026-10-25 15:00:00+00', '2026-10-25 15:20:00+00', 'Qurban 1 ekor sapi utuh untuk kebaikan bersama.'),
(13, 'INV-20261025-A009', 1, 1, 'Andi Dermawan', 'andi@email.com', '08123456789', FALSE, 50000, 0, 50000, 0, 'PAID', NULL, '2026-10-25 16:00:00+00', '2026-10-25 16:05:00+00', 'Sedikit infaq untuk operasional yayasan.'),
(14, 'INV-20261025-A010', 2, 2, 'Budi Santoso', 'budi.s@email.com', '08567890123', FALSE, 415000, 4000, 419000, 0, 'PAID', '807708567890123', '2026-10-25 17:00:00+00', '2026-10-25 17:15:00+00', 'Paket kado yatim, semoga mereka bahagia di hari lebaran.'),
(15, 'INV-20261025-A011', 3, 3, 'Siti Aminah', 'siti@email.com', '08198765432', FALSE, 500000, 4000, 504000, 0, 'PAID', '888808198765432', '2026-10-25 18:00:00+00', '2026-10-25 18:10:00+00', 'Untuk pembangunan masjid Al-Ikhlas, semoga segera tegak berdiri.');

INSERT INTO transactions (id, invoice_id, invoice_created_at, campaign_id, variant_id, qty, amount, created_at) VALUES 
(1, 1, '2026-10-12 14:30:00+00', 1, NULL, 1, 100000, '2026-10-12 14:30:00+00'),
(2, 2, '2026-10-12 15:10:00+00', 5, NULL, 1, 500000, '2026-10-12 15:10:00+00'),
(3, 3, '2026-10-12 16:05:00+00', 8, 4, 1, 21000000, '2026-10-12 16:05:00+00'),
(4, 4, '2026-10-11 09:15:00+00', 11, NULL, 1, 5000000, '2026-10-11 09:15:00+00'),
(5, 5, '2026-10-25 08:00:00+00', 1, NULL, 1, 150000, '2026-10-25 08:00:00+00'),
(6, 6, '2026-10-25 09:00:00+00', 2, NULL, 1, 250000, '2026-10-25 09:00:00+00'),
(7, 7, '2026-10-25 10:00:00+00', 3, NULL, 1, 100000, '2026-10-25 10:00:00+00'),
(8, 8, '2026-10-25 11:00:00+00', 4, 1, 1, 35000, '2026-10-25 11:00:00+00'),
(9, 9, '2026-10-25 12:00:00+00', 5, NULL, 1, 1000000, '2026-10-25 12:00:00+00'),
(10, 10, '2026-10-25 13:00:00+00', 6, 2, 1, 2500000, '2026-10-25 13:00:00+00'),
(11, 11, '2026-10-25 14:00:00+00', 7, 3, 1, 3000000, '2026-10-25 14:00:00+00'),
(12, 12, '2026-10-25 15:00:00+00', 8, 4, 1, 21000000, '2026-10-25 15:00:00+00'),
(13, 13, '2026-10-25 16:00:00+00', 9, NULL, 1, 50000, '2026-10-25 16:00:00+00'),
(14, 14, '2026-10-25 17:00:00+00', 10, 5, 1, 415000, '2026-10-25 17:00:00+00'),
(15, 15, '2026-10-25 18:00:00+00', 11, NULL, 1, 500000, '2026-10-25 18:00:00+00');

-- Qurban Names untuk Transaksi 3
INSERT INTO transaction_qurban_names (id, transaction_id, transaction_created_at, mudhohi_name, created_at) VALUES 
(1, 3, '2026-10-12 16:05:00+00', 'Budi Santoso', '2026-10-12 16:05:00+00'), (2, 3, '2026-10-12 16:05:00+00', 'Istri Budi', '2026-10-12 16:05:00+00'),
(3, 3, '2026-10-12 16:05:00+00', 'Anak 1', '2026-10-12 16:05:00+00'), (4, 3, '2026-10-12 16:05:00+00', 'Anak 2', '2026-10-12 16:05:00+00'),
(5, 3, '2026-10-12 16:05:00+00', 'Anak 3', '2026-10-12 16:05:00+00'), (6, 3, '2026-10-12 16:05:00+00', 'Anak 4', '2026-10-12 16:05:00+00'),
(7, 3, '2026-10-12 16:05:00+00', 'Anak 5', '2026-10-12 16:05:00+00');

-- 7. NOTIFICATION TEMPLATES & LOGS (Dengan Data JSON Payload Realistis)
INSERT INTO notification_templates (id, event_trigger, channel, message_content, is_active) VALUES
(1, 'DONATION_SUCCESS', 'WHATSAPP', 'Terima kasih {nama}, donasi Rp {nominal} via {metode} berhasil kami terima. Semoga membawa keberkahan.', TRUE),
(2, 'INVOICE_PENDING', 'WHATSAPP', 'Halo {nama}, tagihan donasi Rp {nominal} menunggu pembayaran. Silakan transfer ke {metode} berikut: {va_number} sebelum kedaluwarsa.', TRUE);

-- Payment Logs (Merekam Request & Response ke Payment Gateway)
INSERT INTO payment_logs (id, invoice_code, endpoint, type, request_payload, response_payload, http_status) VALUES
(1, 'TRX-9921', 'https://api.midtrans.com/v2/charge', 'PAYMENT_REQUEST', '{"payment_type": "gopay", "transaction_details": {"order_id": "TRX-9921", "gross_amount": 100000}}', '{"status_code": "201", "transaction_status": "pending", "actions": [{"name": "generate-qr-code", "url": "https://api.sandbox.midtrans.com/v2/gopay/123456/qr-code"}]}', 201),
(2, 'TRX-9922', 'https://api.xendit.co/v2/virtual_accounts', 'PAYMENT_REQUEST', '{"external_id": "TRX-9922", "bank_code": "BCA", "name": "Hamba Allah", "expected_amount": 504000, "is_closed": true}', '{"id": "614c...va", "external_id": "TRX-9922", "bank_code": "BCA", "merchant_code": "8077", "account_number": "807708123456789", "expected_amount": 504000, "status": "PENDING"}', 200),
(3, 'TRX-9923', 'https://api.xendit.co/callback/virtual_accounts', 'CALLBACK', '{"external_id": "TRX-9923", "amount": 21004000, "status": "COMPLETED", "transaction_timestamp": "2026-10-12T16:15:00.000Z"}', '{"status": "success", "message": "Callback processed and jobs queued"}', 200);

-- Notification Logs (Merekam Request & Response ke Fonnte API)
INSERT INTO notification_logs (id, template_id, invoice_code, recipient, channel, request_payload, response_payload, status) VALUES
(1, 1, 'TRX-9921', '08123456789', 'WHATSAPP', '{"target": "08123456789", "message": "Terima kasih Andi Dermawan, donasi Rp 100.000 via GoPay berhasil kami terima. Semoga membawa keberkahan.", "countryCode": "62"}', '{"status": true, "detail": "message sent successfully", "process": "1 messages sent"}', 'SUCCESS'),
(2, 2, 'TRX-9922', '08123456789', 'WHATSAPP', '{"target": "08123456789", "message": "Halo Hamba Allah, tagihan donasi Rp 504.000 menunggu pembayaran. Silakan transfer ke BCA Virtual Account berikut: 807708123456789 sebelum kedaluwarsa.", "countryCode": "62"}', '{"status": true, "detail": "message sent successfully"}', 'SUCCESS');

-- Ads Conversion Logs (Merekam Server-to-Server hit ke Meta CAPI & TikTok Events API)
INSERT INTO ads_conversion_logs (id, invoice_code, platform, event_name, request_payload, response_payload, http_status, status) VALUES
(1, 'TRX-9921', 'META_CAPI', 'Purchase', '{"data": [{"event_name": "Purchase", "event_time": 1791786600, "action_source": "website", "user_data": {"em": "78...hash...", "ph": "08...hash...", "client_ip_address": "192.168.1.1", "client_user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)", "fbc": "fb.1.123abc456"}, "custom_data": {"currency": "IDR", "value": 100000}}]}', '{"events_received": 1, "messages": [], "fbtrace_id": "Cabc123xyz"}', 200, 'SUCCESS'),
(2, 'TRX-9923', 'TIKTOK_EVENTS_API', 'CompletePayment', '{"event": "CompletePayment", "event_time": 1791792900, "user": {"ttclid": "tiktok.abc.123", "ip": "114.120.10.15", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "phone": "08567890123"}, "properties": {"currency": "IDR", "value": 21000000}}', '{"code": 0, "message": "OK", "data": {"trace_id": "tt_trace_123456"}}', 200, 'SUCCESS');

-- Reset Auto-Increment Sequences (Untuk mengamankan primary keys dari operasi manual inserts di atas)
SELECT setval('ngo_configs_id_seq', (SELECT MAX(id) FROM ngo_configs));
SELECT setval('admins_id_seq', (SELECT MAX(id) FROM admins));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('campaigns_id_seq', (SELECT MAX(id) FROM campaigns));
SELECT setval('campaign_qris_static_id_seq', (SELECT MAX(id) FROM campaign_qris_static));
SELECT setval('campaign_variants_id_seq', (SELECT MAX(id) FROM campaign_variants));
SELECT setval('campaign_updates_id_seq', (SELECT MAX(id) FROM campaign_updates));
SELECT setval('affiliates_id_seq', (SELECT MAX(id) FROM affiliates));
SELECT setval('withdrawals_id_seq', (SELECT MAX(id) FROM withdrawals));
SELECT setval('donors_id_seq', (SELECT MAX(id) FROM donors));
SELECT setval('payment_methods_id_seq', (SELECT MAX(id) FROM payment_methods));
SELECT setval('payment_instructions_id_seq', (SELECT MAX(id) FROM payment_instructions));
SELECT setval('invoices_id_seq', (SELECT MAX(id) FROM invoices));
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
SELECT setval('transaction_qurban_names_id_seq', (SELECT MAX(id) FROM transaction_qurban_names));
SELECT setval('notification_templates_id_seq', (SELECT MAX(id) FROM notification_templates));
SELECT setval('payment_logs_id_seq', (SELECT MAX(id) FROM payment_logs));
SELECT setval('notification_logs_id_seq', (SELECT MAX(id) FROM notification_logs));
SELECT setval('ads_conversion_logs_id_seq', (SELECT MAX(id) FROM ads_conversion_logs));