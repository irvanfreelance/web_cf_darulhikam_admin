# Entity Relationship Document (ERD)
# LAZ Darul Hikam — PostgreSQL Schema

**Database:** PostgreSQL 16 (Neon serverless)  
**Conventions:**
- Primary keys: `BIGSERIAL` (auto-increment, not UUID)
- Enum-like fields: `VARCHAR(50)` with CHECK constraints (portable, no ALTER TYPE needed)
- Timestamps: `TIMESTAMPTZ` (timezone-aware)
- Soft delete: `deleted_at TIMESTAMPTZ NULL` on mutable tables
- All foreign keys explicitly declared and indexed

---

## Schema + Seed

> **Note:** The `donations`, `payment_transactions`, and `donation_verification` tables
> are intentionally excluded from this schema. The crowdfunding portal is being developed
> separately and will be **combined into this database**. All crowdfunding tables will use
> the prefix `cf_` (e.g. `cf_campaigns`, `cf_donations`, `cf_transactions`) so they coexist
> cleanly alongside `web_*` tables in the same PostgreSQL database instance.
> See `crowdfunding-portal.md` for the `cf_*` schema.


```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram search on web_articles
CREATE EXTENSION IF NOT EXISTS unaccent;  -- accent-insensitive search

-- ============================================================
-- TABLE: web_users
-- CMS admin staff accounts
-- ============================================================
CREATE TABLE web_users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   TEXT            NOT NULL,
    role            VARCHAR(50)     NOT NULL DEFAULT 'content_editor'
                        CHECK (role IN ('super_admin','content_editor','finance_staff','program_manager','cs_staff')),
    avatar_url      TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email       ON web_users (email);
CREATE INDEX idx_users_role        ON web_users (role);
CREATE INDEX idx_users_deleted_at  ON web_users (deleted_at) WHERE deleted_at IS NULL;

-- Seed
INSERT INTO web_users (name, email, password_hash, role) VALUES
('Ahmad Habib',      'ahmad@lazdarulhikam.org',    '$2b$12$hashed_placeholder_1', 'super_admin'),
('Sari Ramadhani',   'sari@lazdarulhikam.org',     '$2b$12$hashed_placeholder_2', 'finance_staff'),
('M. Fauzi',         'fauzi@lazdarulhikam.org',    '$2b$12$hashed_placeholder_3', 'program_manager'),
('Rini Nurhayati',   'rini@lazdarulhikam.org',     '$2b$12$hashed_placeholder_4', 'content_editor'),
('Dian Pratiwi',     'dian@lazdarulhikam.org',     '$2b$12$hashed_placeholder_5', 'cs_staff');


-- ============================================================
-- TABLE: web_programs
-- Fundraising program pillars shown in Program page & home
-- CMS: YES — title, desc, target, image, status all editable
-- ============================================================
CREATE TABLE web_programs (
    id               BIGSERIAL PRIMARY KEY,
    slug             VARCHAR(120)    NOT NULL UNIQUE,
    title            VARCHAR(70)    -- kept ≤70 chars    NOT NULL,
    short_desc       TEXT            NOT NULL,
    full_desc        TEXT,
    category         VARCHAR(50)     NOT NULL
                         CHECK (category IN ('education','health','disaster','economy','dakwah')),
    status           VARCHAR(30)     NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','completed','paused','archived')),
    target_amount    NUMERIC(15,2)   NOT NULL DEFAULT 0,
    collected_amount NUMERIC(15,2)   NOT NULL DEFAULT 0,
    thumbnail_url    TEXT,
    is_featured      BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order    SMALLINT        NOT NULL DEFAULT 0,
    created_by       BIGINT          NOT NULL REFERENCES web_users(id),
    updated_by       BIGINT          REFERENCES web_users(id),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT chk_collected_lte_target CHECK (collected_amount >= 0)
);

CREATE INDEX idx_programs_status        ON web_programs (status);
CREATE INDEX idx_programs_is_featured   ON web_programs (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_programs_display_order ON web_programs (display_order);
CREATE INDEX idx_programs_category      ON web_programs (category);
CREATE INDEX idx_programs_deleted_at    ON web_programs (deleted_at) WHERE deleted_at IS NULL;

-- Seed
INSERT INTO web_programs (slug, title, short_desc, category, status, target_amount, collected_amount, is_featured, display_order, created_by) VALUES
('beasiswa-generasi-rabbani',  'Beasiswa Generasi Rabbani',  'Supporting education of underprivileged high-achieving students from elementary to university.',        'education', 'active', 500000000,  347000000,  TRUE,  1, 1),
('layanan-kesehatan-gratis',   'Layanan Kesehatan Gratis',   'Free mobile clinic and medical treatment for dhuafa in remote areas.',                                  'health',    'active', 300000000,  189000000,  TRUE,  2, 1),
('tanggap-bencana-nasional',   'Tanggap Bencana Nasional',   'Rapid humanitarian response and long-term recovery for natural disaster victims across Indonesia.',     'disaster',  'active', 600000000,  521000000,  TRUE,  3, 1),
('modal-usaha-dhuafa',         'Modal Usaha Dhuafa',         'Economic empowerment through revolving capital, entrepreneurship training, and business mentoring.',     'economy',   'active', 250000000,  92000000,   FALSE, 4, 1),
('dakwah-pembinaan-umat',      'Dakwah & Pembinaan Umat',    'Strengthening faith through religious study circles, tahfidz houses, and rural dai deployment.',        'dakwah',    'active', 400000000,  214000000,  FALSE, 5, 1);


-- ============================================================
-- TABLE: web_bank_accounts
-- Official donation bank accounts (shown on ZISWAF page & footer)
-- CMS: YES — super_admin only; rarely changes
-- ============================================================
CREATE TABLE web_bank_accounts (
    id              BIGSERIAL PRIMARY KEY,
    bank_name       VARCHAR(100)    NOT NULL,
    account_number  VARCHAR(50)     NOT NULL,
    account_name    VARCHAR(150)    NOT NULL,
    bank_code       VARCHAR(20),           -- for payment gateway routing
    logo_url        TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_active ON web_bank_accounts (is_active) WHERE is_active = TRUE;

-- Seed
INSERT INTO web_bank_accounts (bank_name, account_number, account_name, bank_code, display_order) VALUES
('Bank Syariah Indonesia (BSI)', '7119XXXXXXX', 'LAZ Darul Hikam', '451', 1),
('BCA Syariah',                  '090XXXXXXX',  'LAZ Darul Hikam', '536', 2),
('Bank Mandiri Syariah',         '700XXXXXXX',  'LAZ Darul Hikam', '451', 3);


-- ============================================================
-- TABLE: web_articles
-- News, field reports, beneficiary stories, announcements.
-- body: full Tiptap HTML — may contain <img>, <iframe> (YouTube), <blockquote>, <ul>, etc.
-- featured_image_* fields store the card thumbnail separately from body media.
-- CMS: YES — content team manages daily
-- ============================================================
CREATE TABLE web_articles (
    id                          BIGSERIAL PRIMARY KEY,

    -- ── Identity ─────────────────────────────────────────────────────────
    slug                        VARCHAR(220)    NOT NULL UNIQUE,
    -- title: kept ≤70 chars so it doubles as <title> tag without truncation
    title                       VARCHAR(70)     NOT NULL,
    -- title_long: full headline for article page <h1> when title is shortened
    title_long                  VARCHAR(300),
    -- excerpt: ≤160 chars plain text → used as <meta description> fallback & card snippet
    excerpt                     VARCHAR(160)    NOT NULL,
    -- body: full Tiptap-rendered HTML; may contain <img>, <iframe> (YouTube), <blockquote>
    body                        TEXT            NOT NULL,
    category                    VARCHAR(50)     NOT NULL
                                    CHECK (category IN ('field_report','program_update','beneficiary_story','announcement','education')),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft','published','archived')),

    -- ── Featured image ────────────────────────────────────────────────────
    -- Card thumbnail, article hero image, AND og:image source.
    -- Stored SEPARATELY from body so listing pages never parse HTML.
    -- alt required for WCAG 2.1 AA + Google image indexing.
    -- width/height required to prevent CLS (Core Web Vital — affects ranking).
    featured_image_url          TEXT,
    featured_image_alt          VARCHAR(300),
    featured_image_caption      VARCHAR(500),
    featured_image_width        SMALLINT,
    featured_image_height       SMALLINT,

    -- ── On-page SEO overrides ─────────────────────────────────────────────
    -- All fields optional. When NULL the system falls back:
    --   <title>          → title (already ≤70 chars, no truncation needed)
    --   meta description → excerpt (already ≤160 chars)
    --   og:image         → featured_image_url
    -- Use these only when you want the social/search text to differ from display text.
    seo_title                   VARCHAR(70),    -- <title> / og:title / twitter:title
    seo_description             VARCHAR(160),   -- <meta name="description"> / og:description
    og_image_url                TEXT,           -- og:image if different from featured_image_url
    og_image_alt                VARCHAR(300),   -- og:image:alt (required by Twitter card spec)
    -- canonical: set when content is republished or cross-posted to avoid duplicate penalty
    canonical_url               TEXT,
    -- robots: per-article kill switch; default index,follow
    robots_directive            VARCHAR(30)     NOT NULL DEFAULT 'index,follow'
                                    CHECK (robots_directive IN ('index,follow','noindex,follow','index,nofollow','noindex,nofollow')),

    -- ── Structured data / JSON-LD ─────────────────────────────────────────
    -- Injected into <head> as <script type="application/ld+json">.
    -- Enables Google rich results: article date, author, image in SERP.
    -- System auto-generates Article/NewsArticle schema on publish;
    -- stored here so it is served without re-computation on every request.
    schema_org_json             JSONB,

    -- ── Twitter card ─────────────────────────────────────────────────────
    twitter_title               VARCHAR(70),
    twitter_description         VARCHAR(200),
    twitter_card_type           VARCHAR(25)     NOT NULL DEFAULT 'summary_large_image'
                                    CHECK (twitter_card_type IN ('summary','summary_large_image')),

    -- ── Hreflang / internationalisation (future) ──────────────────────────
    -- locale: content language tag; enables hreflang annotation
    locale                      VARCHAR(10)     NOT NULL DEFAULT 'id',

    -- ── Relations & engagement ────────────────────────────────────────────
    program_id                  BIGINT          REFERENCES web_programs(id) ON DELETE SET NULL,
    author_id                   BIGINT          NOT NULL REFERENCES web_users(id),
    published_at                TIMESTAMPTZ,
    is_featured                 BOOLEAN         NOT NULL DEFAULT FALSE,
    view_count                  INTEGER         NOT NULL DEFAULT 0,
    -- read_time_min auto-calculated: CEIL(word_count / 200) on save
    read_time_min               SMALLINT,

    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

-- Core filtering
CREATE INDEX idx_art_status        ON web_articles (status);
CREATE INDEX idx_art_published_at  ON web_articles (published_at DESC);
CREATE INDEX idx_art_category      ON web_articles (category);
CREATE INDEX idx_art_program_id    ON web_articles (program_id);
CREATE INDEX idx_art_slug          ON web_articles (slug);
CREATE INDEX idx_art_deleted       ON web_articles (deleted_at) WHERE deleted_at IS NULL;
-- Homepage featured articles (partial — only rows where is_featured=TRUE are indexed)
CREATE INDEX idx_art_featured      ON web_articles (display_order) WHERE is_featured = TRUE AND status = 'published';
-- SEO: robots noindex articles (for exclusion audits)
CREATE INDEX idx_art_noindex       ON web_articles (id) WHERE robots_directive LIKE 'noindex%';
-- Full-text search on title + excerpt (≤70 + ≤160 chars — keeps index small & fast)
CREATE INDEX idx_art_fts           ON web_articles
    USING GIN (to_tsvector('indonesian', title || ' ' || COALESCE(excerpt, '')));
-- Composite: published articles by category ordered by date (covers listing page query)
CREATE INDEX idx_art_cat_date      ON web_articles (category, published_at DESC)
    WHERE status = 'published' AND deleted_at IS NULL;




-- ============================================================
-- Seed: web_articles
-- body = complete Tiptap HTML with inline <img> and YouTube <iframe>.
-- title ≤70 chars (direct <title> tag), title_long = full display headline.
-- excerpt ≤160 chars (direct <meta description> fallback).
-- seo_* fields are left NULL here so system uses title/excerpt/featured_image.
-- schema_org_json auto-generated on publish by application layer.
-- ============================================================

INSERT INTO web_articles (
    slug, title, title_long, excerpt, body,
    category, status, program_id, author_id,
    published_at, is_featured, read_time_min,
    featured_image_url, featured_image_alt, featured_image_caption,
    featured_image_width, featured_image_height,
    seo_title, seo_description, og_image_alt,
    robots_directive, locale
) VALUES

-- ── Article 1: field_report — water distribution NTT ────────────────────────
(
  'distribusi-air-bersih-ntt-2025',
  'Distribusi Air Bersih untuk 1.200 Warga di NTT',
  'Distribusi Air Bersih untuk 1.200 Warga Terdampak Kekeringan di NTT',
  'Tim relawan LAZ mendistribusikan 15.000 liter air bersih ke 8 desa terpencil di Kabupaten Kupang, NTT.',
  '<h2>Krisis Air di Kabupaten Kupang</h2>
<p>Musim kemarau panjang yang melanda Nusa Tenggara Timur sejak April 2025 menyebabkan krisis air bersih di sejumlah desa terpencil. Lebih dari <strong>1.200 warga</strong> di 8 desa Kabupaten Kupang kesulitan mendapat air layak minum selama berpekan-pekan.</p>

<figure>
  <img src="https://images.pexels.com/photos/1446504/pexels-photo-1446504.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Kondisi lahan kering di Kabupaten Kupang akibat kemarau 2025" width="1200" height="675" />
  <figcaption>Kondisi lahan kering di desa terdampak Kabupaten Kupang, Juli 2025. (Foto: Tim Dokumentasi LAZ)</figcaption>
</figure>

<h2>Respon Cepat Tim Relawan LAZ</h2>
<p>Pada 12 Juli 2025, tim relawan LAZ Darul Hikam bersama mitra lokal <strong>Komunitas Peduli NTT</strong> mendistribusikan total <strong>15.000 liter air bersih</strong> via 3 armada truk tangki ke 8 desa dalam 4 hari.</p>

<ul>
  <li>Desa Oelnasi — 2.100 liter untuk 180 KK</li>
  <li>Desa Penfui Timur — 1.800 liter untuk 150 KK</li>
  <li>Desa Noelbaki — 2.400 liter untuk 200 KK</li>
  <li>5 desa lainnya — total 8.700 liter</li>
</ul>

<figure>
  <img src="https://images.pexels.com/photos/6591429/pexels-photo-6591429.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Truk tangki air LAZ Darul Hikam tiba di Desa Oelnasi disambut warga" width="1200" height="800" />
  <figcaption>Armada truk tangki LAZ tiba di Desa Oelnasi. (Foto: Relawan LAZ/Hendra)</figcaption>
</figure>

<h2>Dokumentasi Video Lapangan</h2>
<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    title="Distribusi Air Bersih LAZ Darul Hikam di NTT Juli 2025"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<blockquote>
  <p>"Sudah 3 minggu kami kesulitan air. Hari ini alhamdulillah bisa minum dan masak dengan tenang." — Ibu Maria, warga Desa Oelnasi</p>
</blockquote>

<h2>Rencana Tindak Lanjut</h2>
<p>LAZ Darul Hikam berencana mendistribusikan air tahap kedua dan mensurvei kebutuhan sumur bor permanen di 3 desa paling kritis. Dukung program ini dengan berdonasi pada kanal Tanggap Bencana.</p>',
  'field_report', 'published', 3, 4,
  '2025-07-12 08:00:00+07', TRUE, 5,
  'https://images.pexels.com/photos/2962405/pexels-photo-2962405.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Warga antri mengambil air dari tanki distribusi LAZ Darul Hikam di NTT',
  'Distribusi air bersih LAZ Darul Hikam di Kabupaten Kupang, NTT — Juli 2025',
  1200, 630,
  NULL, NULL, 'Distribusi air bersih LAZ Darul Hikam di NTT untuk warga terdampak kekeringan',
  'index,follow', 'id'
),

-- ── Article 2: program_update — masjid kalteng ───────────────────────────────
(
  'masjid-at-taqwa-kalteng-progress',
  'Masjid At-Taqwa Kalimantan Tengah Capai 70%',
  'Pembangunan Masjid At-Taqwa di Kalimantan Tengah Capai 70%',
  'Progres konstruksi Masjid At-Taqwa di Kalimantan Tengah berjalan lancar dan dipastikan selesai Agustus 2025.',
  '<h2>Update Progres Pembangunan</h2>
<p>Alhamdulillah, per Juli 2025 pembangunan <strong>Masjid At-Taqwa</strong> di Desa Tewah, Kabupaten Gunung Mas, Kalimantan Tengah telah mencapai <strong>70% penyelesaian</strong>. Struktur utama berdiri kokoh dan pengerjaan atap hampir rampung.</p>

<figure>
  <img src="https://images.pexels.com/photos/3862601/pexels-photo-3862601.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Struktur utama Masjid At-Taqwa Kalimantan Tengah sudah berdiri tampak dari depan" width="1200" height="800" />
  <figcaption>Kondisi terkini struktur Masjid At-Taqwa per 5 Juli 2025. (Foto: Koordinator Lapangan LAZ)</figcaption>
</figure>

<h2>Timeline Penyelesaian</h2>
<ul>
  <li><strong>Minggu 1–2 Juli:</strong> Finalisasi rangka atap dan pemasangan genteng</li>
  <li><strong>Minggu 3–4 Juli:</strong> Pengecatan eksterior dan pemasangan pintu/jendela</li>
  <li><strong>Minggu 1–2 Agustus:</strong> Instalasi listrik, sound system, dan interior</li>
  <li><strong>15 Agustus 2025:</strong> Target peresmian dan shalat Jumat perdana</li>
</ul>

<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/ScMzIvxBSi4"
    title="Update Pembangunan Masjid At-Taqwa Kalimantan Tengah Juli 2025"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<figure>
  <img src="https://images.pexels.com/photos/1537086/pexels-photo-1537086.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Interior Masjid At-Taqwa dalam tahap finishing pemasangan keramik lantai" width="1200" height="800" />
  <figcaption>Ruang utama shalat sedang dalam tahap pemasangan keramik lantai. (Foto: Relawan LAZ)</figcaption>
</figure>

<p>Program ini didukung lebih dari <strong>340 wakif</strong> dari seluruh Indonesia. Jazakumullahu khairan kepada seluruh donatur. Wakaf masih terbuka hingga target terpenuhi.</p>',
  'program_update', 'published', 5, 4,
  '2025-07-05 09:00:00+07', FALSE, 4,
  'https://images.pexels.com/photos/2098427/pexels-photo-2098427.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Tampak depan Masjid At-Taqwa Kalimantan Tengah yang sedang dibangun',
  'Masjid At-Taqwa, Desa Tewah, Kabupaten Gunung Mas — progres Juli 2025',
  1200, 630,
  NULL, NULL, 'Progres pembangunan Masjid At-Taqwa Kalimantan Tengah LAZ Darul Hikam',
  'index,follow', 'id'
),

-- ── Article 3: program_update — scholarship recipients ───────────────────────
(
  'beasiswa-2025-2026-penerima',
  '48 Siswa Dhuafa Terima Beasiswa Penuh 2025/2026',
  '48 Siswa Dhuafa Berprestasi Terima Beasiswa Penuh Tahun Ajaran 2025/2026',
  'LAZ Darul Hikam menetapkan 48 siswa dhuafa berprestasi sebagai penerima beasiswa penuh 2025/2026, tersebar di 12 kota.',
  '<h2>Seleksi Ketat, Amanah Besar</h2>
<p>Setelah verifikasi kondisi ekonomi keluarga, wawancara motivasi, dan penilaian prestasi, <strong>LAZ Darul Hikam resmi menetapkan 48 penerima Beasiswa Generasi Rabbani</strong> untuk tahun ajaran 2025/2026.</p>

<figure>
  <img src="https://images.pexels.com/photos/8617942/pexels-photo-8617942.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Para penerima beasiswa LAZ Darul Hikam 2025 berfoto bersama di kantor LAZ Bandung" width="1200" height="800" />
  <figcaption>48 penerima Beasiswa Generasi Rabbani 2025/2026 berfoto bersama tim LAZ usai pengumuman, 28 Juni 2025. (Foto: Divisi Komunikasi LAZ)</figcaption>
</figure>

<h2>Sebaran Penerima</h2>
<ul>
  <li><strong>Jenjang SMP:</strong> 12 siswa (Bandung, Surabaya, Medan)</li>
  <li><strong>Jenjang SMA/SMK:</strong> 20 siswa (7 kota)</li>
  <li><strong>Jenjang Perguruan Tinggi:</strong> 16 mahasiswa (5 PTN)</li>
</ul>

<blockquote>
  <p>"Saya tidak pernah menyangka bisa kuliah di ITB. Ayah saya hanya buruh tani. Beasiswa ini benar-benar mengubah hidup kami." — Fajar Sidiq, penerima beasiswa S1 Teknik ITB</p>
</blockquote>

<figure>
  <img src="https://images.pexels.com/photos/5427868/pexels-photo-5427868.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Fajar Sidiq mahasiswa ITB penerima beasiswa LAZ di depan kampus ITB Bandung" width="900" height="1200" />
  <figcaption>Fajar Sidiq (18), putra buruh tani Banyumas, kini mahasiswa Teknik Sipil ITB. (Foto: Humas LAZ)</figcaption>
</figure>

<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/Ks-_Mh1QhMg"
    title="Kisah Penerima Beasiswa Generasi Rabbani LAZ Darul Hikam 2025"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<p>Program Beasiswa Generasi Rabbani telah mencetak lebih dari <strong>420 alumni</strong> sejak 2014. Dukung generasi berikutnya dengan berinfaq melalui program beasiswa kami.</p>',
  'program_update', 'published', 1, 4,
  '2025-06-29 10:00:00+07', TRUE, 5,
  'https://images.pexels.com/photos/7092613/pexels-photo-7092613.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Para penerima beasiswa LAZ Darul Hikam 2025 berfoto bersama di Bandung',
  'Pengumuman resmi penerima Beasiswa Generasi Rabbani tahun ajaran 2025/2026',
  1200, 630,
  NULL, NULL, 'Beasiswa Generasi Rabbani LAZ Darul Hikam untuk 48 siswa dhuafa berprestasi',
  'index,follow', 'id'
),

-- ── Article 4: field_report — economic empowerment Surabaya ──────────────────
(
  'modal-bergulir-surabaya-berdaya-mandiri',
  '87 Pedagang Kecil Surabaya Terima Modal Bergulir LAZ',
  '87 Pedagang Kecil Surabaya Terima Modal Bergulir Program Berdaya Mandiri',
  'Omset 87 pedagang kecil peserta program Berdaya Mandiri LAZ Darul Hikam meningkat rata-rata 40% dalam tiga bulan.',
  '<h2>Memberdayakan Pelaku UMKM Dhuafa</h2>
<p>Program <strong>Berdaya Mandiri</strong> LAZ Darul Hikam menjawab kebutuhan modal bagi UMKM kecil yang tidak bankable. Kuartal II 2025, program ini menjangkau <strong>87 pedagang kecil</strong> di 5 kelurahan Surabaya Timur.</p>

<figure>
  <img src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Penyerahan modal bergulir kepada perwakilan pedagang kecil di Kelurahan Mulyorejo Surabaya" width="1200" height="800" />
  <figcaption>Penyerahan modal bergulir di Kantor Kelurahan Mulyorejo, 18 Juni 2025. (Foto: Koordinator Program LAZ Surabaya)</figcaption>
</figure>

<h2>Dampak Nyata dalam 3 Bulan</h2>
<ul>
  <li>Rata-rata kenaikan omset harian: <strong>+40%</strong></li>
  <li>Peserta yang berhasil membuka cabang: <strong>8 orang</strong></li>
  <li>Tingkat pengembalian modal bergulir tepat waktu: <strong>94%</strong></li>
  <li>Peserta yang berhasil membuka rekening tabungan: <strong>71 orang</strong></li>
</ul>

<blockquote>
  <p>"Modal Rp 3 juta saya gunakan tambah stok bahan baku. Omset warung dari Rp 150 ribu jadi Rp 220 ribu per hari. Terima kasih LAZ." — Nur Khasanah, pedagang nasi, Kelurahan Mulyorejo</p>
</blockquote>

<figure>
  <img src="https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Nur Khasanah di warung nasinya yang semakin ramai setelah menerima modal bergulir LAZ" width="1200" height="900" />
  <figcaption>Nur Khasanah (42) di warung nasinya yang kini semakin ramai. (Foto: Tim Lapangan LAZ)</figcaption>
</figure>

<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/ZXsQAXx_ao0"
    title="Kisah Sukses Peserta Program Berdaya Mandiri LAZ Darul Hikam Surabaya"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<p>Program Berdaya Mandiri sedang dalam proses ekspansi ke Semarang dan Yogyakarta. Dukung program ini agar lebih banyak keluarga dhuafa bisa mandiri secara ekonomi.</p>',
  'field_report', 'published', 4, 4,
  '2025-06-20 11:00:00+07', FALSE, 5,
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Para peserta program Berdaya Mandiri LAZ berfoto di depan stand UMKM mereka',
  'Penyerahan modal bergulir Program Berdaya Mandiri LAZ Darul Hikam, Surabaya — Juni 2025',
  1200, 630,
  NULL, NULL, 'Program Berdaya Mandiri LAZ Darul Hikam: modal bergulir untuk pedagang kecil Surabaya',
  'index,follow', 'id'
),

-- ── Article 5: field_report — mobile clinic Papua ─────────────────────────────
(
  'klinik-keliling-papua-juni-2025',
  'Klinik Keliling LAZ Layani 2.300 Warga di 6 Desa Papua',
  'Klinik Keliling LAZ Darul Hikam Layani 2.300 Warga Dhuafa di 6 Desa Papua',
  'Tim medis LAZ bersama dokter relawan memberikan layanan kesehatan gratis termasuk pemeriksaan umum, gigi, dan obat-obatan di Papua.',
  '<h2>Menjangkau yang Tak Terjangkau</h2>
<p>Akses layanan kesehatan masih jadi tantangan besar di pelosok Papua. <strong>Klinik Keliling LAZ Darul Hikam</strong> hadir menjembatani kesenjangan ini dengan membawa dokter, perawat, dan obat-obatan langsung ke desa.</p>

<figure>
  <img src="https://images.pexels.com/photos/8942991/pexels-photo-8942991.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Tenda klinik keliling LAZ Darul Hikam di Desa Sugapa Kabupaten Intan Jaya Papua Tengah" width="1200" height="800" />
  <figcaption>Tenda pelayanan klinik keliling LAZ di Desa Sugapa, Intan Jaya, Papua Tengah. (Foto: dr. Aldi, Relawan)</figcaption>
</figure>

<h2>Layanan yang Diberikan (4–9 Juni 2025)</h2>
<ul>
  <li><strong>Pemeriksaan umum:</strong> 1.840 pasien</li>
  <li><strong>Pemeriksaan gigi dasar:</strong> 280 pasien</li>
  <li><strong>Konsultasi gizi anak:</strong> 180 pasien</li>
  <li><strong>Distribusi obat-obatan:</strong> 2.300 paket</li>
  <li><strong>Imunisasi anak:</strong> 124 anak (kerjasama Dinkes setempat)</li>
</ul>

<figure>
  <img src="https://images.pexels.com/photos/5905902/pexels-photo-5905902.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="Dokter relawan LAZ memeriksa bayi di Desa Biandoga Papua" width="1200" height="900" />
  <figcaption>dr. Sari memberikan konsultasi gizi kepada ibu dan bayinya di Desa Biandoga. (Foto: Tim LAZ)</figcaption>
</figure>

<blockquote>
  <p>"Sudah 2 tahun tidak periksa dokter karena tidak ada biaya dan puskesmas jauh. Alhamdulillah hari ini gratis dan dikasih obat." — Bapak Yohanis, warga Desa Sugapa</p>
</blockquote>

<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/YE7VzlLtp9M"
    title="Klinik Keliling LAZ Darul Hikam Melayani Warga Pelosok Papua Juni 2025"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<p>Klinik Keliling LAZ berjalan rutin setiap kuartal ke daerah 3T. Bantu kami melanjutkan misi ini dengan berdonasi ke program Layanan Kesehatan Gratis.</p>',
  'field_report', 'published', 2, 4,
  '2025-06-10 08:00:00+07', FALSE, 5,
  'https://images.pexels.com/photos/3259624/pexels-photo-3259624.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Antrian warga Papua menunggu pemeriksaan di klinik keliling LAZ Darul Hikam',
  'Klinik Keliling LAZ Darul Hikam di Papua Tengah — Juni 2025',
  1200, 630,
  NULL, NULL, 'Klinik keliling LAZ Darul Hikam layani 2.300 warga dhuafa di 6 desa Papua Tengah',
  'index,follow', 'id'
),

-- ── Article 6: beneficiary_story — tahfidz house graduates ───────────────────
(
  'rumah-tahfidz-cetak-hafidz-baru',
  'Rumah Tahfidz LAZ Cetak 12 Hafidz Quran dari Keluarga Dhuafa',
  'Rumah Tahfidz LAZ Darul Hikam Cetak 12 Hafidz Quran Baru dari Kalangan Dhuafa',
  'Program tahfidz intensif 2 tahun LAZ Darul Hikam mencetak 12 hafidz Quran dari keluarga dhuafa, siap mengajar di pesantren.',
  '<h2>Mencetak Penjaga Kalamullah dari Keluarga Dhuafa</h2>
<p>Sabtu 31 Mei 2025, <strong>Rumah Tahfidz Darul Hikmah</strong> binaan LAZ menggelar wisuda angkatan ke-4. Sebanyak <strong>12 santri</strong> dari keluarga dhuafa dinyatakan hafal 30 juz Al-Quran.</p>

<figure>
  <img src="https://images.pexels.com/photos/8101622/pexels-photo-8101622.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="12 hafidz baru Rumah Tahfidz Darul Hikmah berfoto dengan pembimbing dan Direktur LAZ wisuda angkatan ke-4" width="1200" height="800" />
  <figcaption>Para hafidz angkatan ke-4 bersama Direktur Utama LAZ Ust. Ahmad Habib dan pembimbing tahfidz. 31 Mei 2025. (Foto: Humas LAZ)</figcaption>
</figure>

<h2>Perjalanan 2 Tahun Penuh Dedikasi</h2>
<ul>
  <li>Total santri aktif saat ini: 48 orang (3 angkatan berjalan)</li>
  <li>Durasi program: 24 bulan intensif</li>
  <li>Metode: Yanbu''ul Quran dengan muraja''ah harian</li>
  <li>Lokasi: Rumah Tahfidz Darul Hikmah, Cimahi, Jawa Barat</li>
</ul>

<blockquote>
  <p>"Bapak meninggal waktu saya kelas 5 SD. Ibu kerja ART. Kalau bukan karena LAZ, tidak mungkin saya bisa hafal Quran. Ini persembahan terbaik untuk alm. Bapak." — M. Irfan Hakim (17), hafidz termuda angkatan ke-4</p>
</blockquote>

<figure>
  <img src="https://images.pexels.com/photos/8101541/pexels-photo-8101541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" alt="M. Irfan Hakim menerima ijazah tahfidz 30 juz dari Direktur LAZ Ust. Ahmad Habib" width="900" height="1200" />
  <figcaption>M. Irfan Hakim (17) menerima ijazah tahfidz dari Direktur Utama LAZ. Hafidz termuda angkatan ke-4. (Foto: Divisi Komunikasi LAZ)</figcaption>
</figure>

<div class="video-embed">
  <iframe width="560" height="315"
    src="https://www.youtube.com/embed/kffacxfA7G4"
    title="Wisuda Hafidz Angkatan ke-4 Rumah Tahfidz Darul Hikmah LAZ Darul Hikam 2025"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>

<p>Ke-12 hafidz baru akan menjadi pengajar di majelis ilmu dan pesantren mitra LAZ. Dengan wakaf Anda, satu hafidz lagi bisa lahir. <strong>Titipkan wakaf untuk program Dakwah & Pembinaan Umat.</strong></p>',
  'beneficiary_story', 'published', 5, 4,
  '2025-06-02 09:00:00+07', FALSE, 4,
  'https://images.pexels.com/photos/7249337/pexels-photo-7249337.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Momen wisuda angkatan ke-4 Rumah Tahfidz Darul Hikmah dengan 12 hafidz baru',
  'Wisuda Hafidz Angkatan ke-4 Rumah Tahfidz Darul Hikmah, Cimahi — 31 Mei 2025',
  1200, 630,
  NULL, NULL, 'Wisuda 12 hafidz Quran Rumah Tahfidz LAZ Darul Hikam angkatan ke-4 dari keluarga dhuafa',
  'index,follow', 'id'
);

-- ============================================================
-- TABLE: web_tags
-- Article tagging system
-- CMS: YES — auto-created on article save
-- ============================================================
CREATE TABLE web_tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)     NOT NULL UNIQUE,
    slug        VARCHAR(80)     NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON web_tags (slug);

INSERT INTO web_tags (name, slug) VALUES
('Beasiswa',        'beasiswa'),
('NTT',            'ntt'),
('Tanggap Bencana', 'tanggap-bencana'),
('Kesehatan',       'kesehatan'),
('Ekonomi',         'ekonomi'),
('Dakwah',          'dakwah'),
('Kalimantan',      'kalimantan'),
('Papua',           'papua'),
('Tahfidz',         'tahfidz'),
('Wakaf',           'wakaf');


-- ============================================================
-- TABLE: web_article_tags  (junction)
-- ============================================================
CREATE TABLE web_article_tags (
    article_id  BIGINT  NOT NULL REFERENCES web_articles(id) ON DELETE CASCADE,
    tag_id      BIGINT  NOT NULL REFERENCES web_tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_article_tags_tag_id ON web_article_tags (tag_id);

INSERT INTO web_article_tags (article_id, tag_id) VALUES
(1, 2), (1, 3),   -- water distribution: NTT, tanggap bencana
(2, 7), (2, 10),  -- masjid kalteng: kalimantan, wakaf
(3, 1),           -- beasiswa
(4, 5),           -- ekonomi
(5, 4), (5, 8),   -- klinik: kesehatan, papua
(6, 6), (6, 9);   -- tahfidz: dakwah, tahfidz


-- ============================================================
-- TABLE: web_testimonials
-- Muzakki (donor) and Mustahiq (beneficiary) quotes
-- CMS: YES — communication team manages
-- ============================================================
CREATE TABLE web_testimonials (
    id              BIGSERIAL PRIMARY KEY,
    person_name     VARCHAR(150)    NOT NULL,
    person_role     VARCHAR(150)    NOT NULL,   -- e.g. "Pengusaha, Jakarta"
    person_type     VARCHAR(20)     NOT NULL
                        CHECK (person_type IN ('muzakki','mustahiq')),
    initials        CHAR(3)         NOT NULL,   -- display avatar initials e.g. "AR"
    quote           TEXT            NOT NULL,
    avatar_url      TEXT,
    program_id      BIGINT          REFERENCES web_programs(id) ON DELETE SET NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testimonials_type         ON web_testimonials (person_type);
CREATE INDEX idx_testimonials_is_active    ON web_testimonials (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_testimonials_display_order ON web_testimonials (display_order);

INSERT INTO web_testimonials (person_name, person_role, person_type, initials, quote, program_id, display_order) VALUES
('Ahmad Rizaldi', 'Pengusaha, Jakarta',   'muzakki',  'AR', 'Sudah 3 tahun berzakat di LAZ Darul Hikam. Laporannya detail, ada foto dan video penyalurannya. Sangat senang bisa tahu zakat saya sampai ke tangan yang tepat.',      NULL, 1),
('Suwardi',       'Petani, Banyumas',     'mustahiq', 'SW', 'Berkat beasiswa dari LAZ Darul Hikam, anak saya bisa melanjutkan sekolah. Tadinya hampir putus asa. Sekarang dia kelas 11 dan bercita-cita jadi dokter.',          1,    2),
('Fatimah Hasan', 'HR Manager, Bandung',  'muzakki',  'FH', 'Kantor kami rutin berkolaborasi untuk CSR. Tim LAZ sangat responsif dan laporannya lengkap untuk ditunjukkan ke manajemen pusat.',                               NULL, 3),
('Nur Khasanah',  'Pedagang, Semarang',   'mustahiq', 'NK', 'Modal bergulir dari LAZ mengubah hidup saya. Warung kecil saya kini berkembang dan saya sudah bisa mencicil rumah sendiri.',                                      4,    4);


-- ============================================================
-- TABLE: web_impact_metrics
-- Counter numbers shown in Dampak section (animated counters)
-- CMS: YES — finance team updates monthly
-- ============================================================
CREATE TABLE web_impact_metrics (
    id              BIGSERIAL PRIMARY KEY,
    metric_key      VARCHAR(60)     NOT NULL UNIQUE,  -- e.g. 'total_funds_distributed'
    label           VARCHAR(150)    NOT NULL,
    value           NUMERIC(15,2)   NOT NULL DEFAULT 0,
    suffix          VARCHAR(20),                       -- e.g. 'M+', 'rb+', '+'
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    updated_by      BIGINT          REFERENCES web_users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impact_metrics_active ON web_impact_metrics (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_impact_metrics_order  ON web_impact_metrics (display_order);

INSERT INTO web_impact_metrics (metric_key, label, value, suffix, display_order, updated_by) VALUES
('total_funds_distributed_m',  'Dana Tersalurkan (Rp)',  47,    'M+',  1, 2),
('total_beneficiaries_k',      'Penerima Manfaat',        127,   'rb+', 2, 2),
('provinces_reached',          'Provinsi Terjangkau',     28,    '',    3, 2),
('active_volunteers',          'Relawan Aktif',            1200,  '+',   4, 2);


-- ============================================================
-- TABLE: web_partners
-- Partner/institution logos shown in marquee section
-- CMS: YES — partnership team manages quarterly
-- ============================================================
CREATE TABLE web_partners (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    logo_url        TEXT,
    website_url     TEXT,
    partner_type    VARCHAR(50)
                        CHECK (partner_type IN ('corporate','government','ngo','academic','media','other')),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_active ON web_partners (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_partners_order  ON web_partners (display_order);

INSERT INTO web_partners (name, partner_type, display_order) VALUES
('Bank Syariah Indonesia',     'corporate',   1),
('BAZNAS Pusat',               'government',  2),
('Kemensos RI',                'government',  3),
('Forum Zakat (FOZ)',          'ngo',         4),
('MUI Pusat',                  'government',  5),
('Pesantren Darul Hikam',      'academic',    6),
('Univ. Al-Azhar Indonesia',   'academic',    7),
('PT Pertamina (Persero)',     'corporate',   8),
('RS Islam Jakarta',           'ngo',         9),
('Komunitas Sahabat Yatim',    'ngo',         10);


-- ============================================================
-- TABLE: web_financial_reports
-- Downloadable PDFs shown on Transparansi page
-- CMS: YES — finance team uploads quarterly/annually
-- ============================================================
CREATE TABLE web_financial_reports (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(250)    NOT NULL,
    report_type     VARCHAR(30)     NOT NULL
                        CHECK (report_type IN ('annual','quarterly','monthly','special_audit')),
    period_label    VARCHAR(50)     NOT NULL,    -- e.g. "Q2 2025", "Tahunan 2024"
    period_year     SMALLINT        NOT NULL,
    period_quarter  SMALLINT        CHECK (period_quarter IN (1,2,3,4)),  -- NULL for annual
    audit_status    VARCHAR(40)     NOT NULL DEFAULT 'unaudited'
                        CHECK (audit_status IN ('unaudited','internally_reviewed','kap_audited')),
    file_url        TEXT            NOT NULL,
    file_size_kb    INTEGER,
    download_count  INTEGER         NOT NULL DEFAULT 0,
    is_published    BOOLEAN         NOT NULL DEFAULT FALSE,
    uploaded_by     BIGINT          NOT NULL REFERENCES web_users(id),
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_year         ON web_financial_reports (period_year DESC);
CREATE INDEX idx_reports_type         ON web_financial_reports (report_type);
CREATE INDEX idx_reports_is_published ON web_financial_reports (is_published) WHERE is_published = TRUE;

INSERT INTO web_financial_reports (title, report_type, period_label, period_year, period_quarter, audit_status, file_url, file_size_kb, is_published, uploaded_by, published_at) VALUES
('Laporan Keuangan Tahunan 2024',  'annual',    'Tahunan 2024', 2024, NULL, 'kap_audited',      '/reports/laz-annual-2024.pdf', 2840, TRUE, 2, '2025-03-01 00:00:00+07'),
('Laporan Triwulan Q2 2025',       'quarterly', 'Q2 2025',      2025, 2,    'internally_reviewed', '/reports/laz-q2-2025.pdf',  1120, TRUE, 2, '2025-07-10 00:00:00+07'),
('Laporan Triwulan Q1 2025',       'quarterly', 'Q1 2025',      2025, 1,    'kap_audited',      '/reports/laz-q1-2025.pdf', 1080, TRUE, 2, '2025-04-15 00:00:00+07'),
('Laporan Keuangan Tahunan 2023',  'annual',    'Tahunan 2023', 2023, NULL, 'kap_audited',      '/reports/laz-annual-2023.pdf', 2650, TRUE, 2, '2024-03-10 00:00:00+07');


-- ============================================================
-- TABLE: web_team_members
-- Board of directors and key staff shown on Tentang Kami
-- CMS: YES — HR / Sekretariat manages as needed
-- ============================================================
CREATE TABLE web_team_members (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    department      VARCHAR(100),
    initials        CHAR(3)         NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    accent_color    VARCHAR(10)     DEFAULT '#3268C3',  -- hex color for avatar bg
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_active ON web_team_members (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_team_order  ON web_team_members (display_order);

INSERT INTO web_team_members (name, title, department, initials, accent_color, display_order) VALUES
('Ust. Ahmad Habib, Lc.',  'Direktur Utama',              'Eksekutif',     'AH', '#3268C3', 1),
('Sari Ramadhani, S.E.',   'Direktur Keuangan',           'Keuangan',      'SR', '#1a6b3c', 2),
('M. Fauzi, S.Kom.',       'Direktur Program',            'Program',       'MF', '#c9892a', 3),
('Rini Nurhayati, S.H.',   'Direktur Legal & Compliance', 'Legal',         'RN', '#5585d4', 4);


-- ============================================================
-- TABLE: web_faqs
-- FAQ accordion items on Contact page
-- CMS: YES — CS team manages monthly
-- ============================================================
CREATE TABLE web_faqs (
    id              BIGSERIAL PRIMARY KEY,
    question        TEXT            NOT NULL,
    answer          TEXT            NOT NULL,
    category        VARCHAR(60)     DEFAULT 'general'
                        CHECK (category IN ('general','donation','zakat','program','partnership','technical')),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    created_by      BIGINT          REFERENCES web_users(id) ON DELETE SET NULL,
    updated_by      BIGINT          REFERENCES web_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faqs_active   ON web_faqs (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_faqs_category ON web_faqs (category);
CREATE INDEX idx_faqs_order    ON web_faqs (display_order);

INSERT INTO web_faqs (question, answer, category, display_order, created_by) VALUES
('Apakah LAZ Darul Hikam sudah berizin resmi?',
 'Ya, LAZ Darul Hikam mendapat izin resmi dari Kementerian Agama RI melalui SK Nomor 792 Tahun 2020 dan terdaftar sebagai anggota BAZNAS.',
 'general', 1, 5),

('Bagaimana cara memastikan donasi saya sudah diterima?',
 'Anda akan menerima konfirmasi via email dan SMS setelah donasi dikonfirmasi. Status donasi juga bisa dicek melalui dashboard transparansi kami.',
 'donation', 2, 5),

('Apakah ada biaya administrasi dari donasi?',
 'Tidak ada potongan biaya administrasi. 100% dana yang Anda titipkan disalurkan sesuai peruntukannya; biaya operasional LAZ ditanggung dari pos amil.',
 'donation', 3, 5),

('Bisakah saya berdonasi secara anonim?',
 'Tentu bisa. Pilih opsi Donasi Anonim pada form donasi kami. Nama Anda tidak akan dicantumkan dalam laporan publik.',
 'donation', 4, 5),

('Berapa minimal donasi yang bisa saya berikan?',
 'Tidak ada batas minimal donasi. Sekecil apapun yang Anda berikan, InsyaAllah akan berdampak bagi sesama.',
 'general', 5, 5);


-- ============================================================
-- TABLE: web_fund_allocations
-- Monthly breakdown of how collected funds are allocated per program
-- CMS: YES — finance team updates when submitting monthly report
-- ============================================================
CREATE TABLE web_fund_allocations (
    id              BIGSERIAL PRIMARY KEY,
    program_id      BIGINT          NOT NULL REFERENCES web_programs(id) ON DELETE CASCADE,
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    allocated_amount NUMERIC(15,2)  NOT NULL CHECK (allocated_amount >= 0),
    disbursed_amount NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK (disbursed_amount >= 0),
    beneficiary_count INTEGER       NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      BIGINT          REFERENCES web_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (program_id, period_year, period_month)
);

CREATE INDEX idx_alloc_program_id ON web_fund_allocations (program_id);
CREATE INDEX idx_alloc_period     ON web_fund_allocations (period_year DESC, period_month DESC);

INSERT INTO web_fund_allocations (program_id, period_year, period_month, allocated_amount, disbursed_amount, beneficiary_count, created_by) VALUES
(1, 2025, 6, 28500000, 28500000, 48,  2),
(2, 2025, 6, 15000000, 14800000, 230, 2),
(3, 2025, 6, 52000000, 52000000, 1200,2),
(4, 2025, 6, 9200000,  9200000,  87,  2),
(5, 2025, 6, 18000000, 17500000, 120, 2),
(1, 2025, 7, 30000000, 22000000, 38,  2),
(3, 2025, 7, 40000000, 40000000, 890, 2);


-- ============================================================
-- TABLE: web_cms_audit_log
-- Tracks every CMS write action for accountability
-- Static: NO — system auto-writes, never manually edited
-- ============================================================
CREATE TABLE web_cms_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES web_users(id) ON DELETE CASCADE,
    action          VARCHAR(30)     NOT NULL
                        CHECK (action IN ('create','update','delete','publish','unpublish','verify_donation')),
    entity_type     VARCHAR(60)     NOT NULL,   -- e.g. 'web_programs', 'web_articles'
    entity_id       BIGINT          NOT NULL,
    diff_json       JSONB,                      -- before/after snapshot
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id     ON web_cms_audit_log (user_id);
CREATE INDEX idx_audit_entity      ON web_cms_audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_created_at  ON web_cms_audit_log (created_at DESC);
-- Partial index for recent activity dashboard
CREATE INDEX idx_audit_recent      ON web_cms_audit_log (created_at DESC) WHERE created_at > NOW() - INTERVAL '90 days';


-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON web_users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_programs_updated_at       BEFORE UPDATE ON web_programs        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_articles_updated_at       BEFORE UPDATE ON web_articles        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- web_articles body content images are embedded as R2 URLs in HTML (no separate table in phase 1)
CREATE TRIGGER trg_testimonials_updated_at   BEFORE UPDATE ON web_testimonials    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_partners_updated_at       BEFORE UPDATE ON web_partners        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_team_members_updated_at   BEFORE UPDATE ON web_team_members    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_faqs_updated_at           BEFORE UPDATE ON web_faqs            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at  BEFORE UPDATE ON web_bank_accounts   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fund_alloc_updated_at     BEFORE UPDATE ON web_fund_allocations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reports_updated_at        BEFORE UPDATE ON web_financial_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- VIEWS: pre-built for API performance
-- ============================================================

-- Active web_programs with progress percentage (used by home & program page)
CREATE OR REPLACE VIEW v_active_programs AS
SELECT
    p.id, p.slug, p.title, p.short_desc, p.category,
    p.target_amount, p.collected_amount,
    CASE WHEN p.target_amount > 0
         THEN ROUND((p.collected_amount / p.target_amount) * 100, 1)
         ELSE 0 END                             AS progress_pct,
    p.thumbnail_url, p.is_featured, p.display_order
FROM web_programs p
WHERE p.status = 'active' AND p.deleted_at IS NULL
ORDER BY p.display_order;

-- Published web_articles with author name (used by news listing)
CREATE OR REPLACE VIEW v_published_articles AS
SELECT
    a.id,
    a.slug,
    a.title,
    a.title_long,
    a.excerpt,
    a.category,
    a.read_time_min,

    -- featured image (all fields for Next.js <Image> and og:image)
    a.featured_image_url,
    a.featured_image_alt,
    a.featured_image_caption,
    a.featured_image_width,
    a.featured_image_height,

    -- SEO — COALESCE ensures API never returns NULL for critical meta tags
    COALESCE(a.seo_title,       a.title)                AS meta_title,
    COALESCE(a.seo_description, a.excerpt)              AS meta_description,
    COALESCE(a.og_image_url,    a.featured_image_url)   AS og_image,
    COALESCE(a.og_image_alt,    a.featured_image_alt)   AS og_image_alt,
    a.canonical_url,
    a.robots_directive,
    a.schema_org_json,
    a.twitter_title,
    a.twitter_description,
    a.twitter_card_type,
    a.locale,

    a.published_at,
    a.is_featured,
    a.view_count,

    u.name  AS author_name,
    p.title AS program_title
FROM web_articles a
JOIN  web_users   u ON u.id = a.author_id
LEFT JOIN web_programs p ON p.id = a.program_id
WHERE a.status = 'published' AND a.deleted_at IS NULL
ORDER BY a.published_at DESC;

-- Note: donation views moved to crowdfunding-portal.md

-- ── SEO audit + sitemap view ─────────────────────────────────────────────────
-- Feed directly into /sitemap.xml generator and the admin SEO audit dashboard.
-- COALESCE resolves all values so no NULLs reach the template layer.
CREATE OR REPLACE VIEW v_article_seo AS
SELECT
    a.id,
    a.slug,
    COALESCE(a.seo_title,       a.title)                    AS meta_title,
    COALESCE(a.seo_description, a.excerpt)                  AS meta_description,
    COALESCE(a.og_image_url,    a.featured_image_url)       AS og_image,
    COALESCE(a.og_image_alt,    a.featured_image_alt)       AS og_image_alt,
    a.canonical_url,
    a.robots_directive,
    a.locale,
    a.schema_org_json,
    a.published_at,
    a.updated_at,
    -- Health flags used by /admin/seo-audit dashboard
    (a.featured_image_url IS NULL)                              AS flag_missing_og_image,
    (a.featured_image_alt IS NULL OR a.featured_image_alt = '') AS flag_missing_alt_text,
    (LENGTH(COALESCE(a.seo_title, a.title)) > 60)               AS flag_title_too_long,
    (LENGTH(COALESCE(a.seo_description, a.excerpt)) > 155)      AS flag_desc_too_long,
    (a.schema_org_json IS NULL)                                 AS flag_missing_schema_org,
    (a.canonical_url IS NOT NULL)                               AS has_canonical_override
FROM web_articles a
WHERE a.deleted_at IS NULL
ORDER BY a.published_at DESC NULLS LAST;

```

---

## ERD Relationship Diagram (Text)

```
web_users ──────────────────────────────────────────────────┐
  │ (created_by / updated_by / author_id / uploaded_by)     │
  ▼                                                          │
web_programs ──────────────────────────────────────────────►│
  │ (program_id FK)                 ▲                        │
  ├──────────────► donations        │                        │
  │                 └── web_bank_accounts (bank_account_id)      │
  │                 └── web_users (verified_by)                  │
  │                                                          │
  ├──────────────► web_articles ────────┘                        │
  │                 ├── web_article_tags ◄──── web_tags              │
  │                 └── web_users (author_id)                    │
  │                                                          │
  ├──────────────► web_testimonials                              │
  ├──────────────► web_fund_allocations                         │
  │                                                          │
  ▼                                                          │
web_financial_reports ──────────────────────────────────────────┘
  └── web_users (uploaded_by)

[standalone tables — no FK to web_programs]
web_impact_metrics
web_partners
web_team_members
web_faqs
web_bank_accounts
web_cms_audit_log ──► web_users (user_id)
```

---

## Index Strategy Summary

| Table | High-Traffic Query | Index |
|-------|-------------------|-------|
| `web_programs` | Homepage featured web_programs | `(is_featured) WHERE is_featured=TRUE` |
| `web_programs` | Program page listing by order | `(display_order)` |
| `web_articles` | Latest news by date | `(published_at DESC)` |
| `web_articles` | Category filter | `(category)` |
| `web_articles` | Full-text search | `GIN tsvector(title + excerpt)` |
| `donations` | Admin verification queue | `(status)` |
| `donations` | Program fundraising sum | `(program_id)` |
| `donations` | Donor history lookup | `(donor_email)` |
| `web_testimonials` | Active ordered display | `(is_active) WHERE is_active=TRUE` |
| `web_impact_metrics` | Homepage counter load | `(is_active) WHERE is_active=TRUE` |
| `web_cms_audit_log` | Recent activity feed | `(created_at DESC) WHERE recent` |

---

## Data Ownership Summary

| Table | Static / Dynamic | CMS Role | Update Frequency |
|-------|-----------------|----------|-----------------|
| `web_users` | Dynamic | `super_admin` | As needed |
| `web_programs` | **CMS Dynamic** | `program_manager` | Weekly |
| `web_bank_accounts` | Quasi-static | `super_admin` only | Rarely |
| `web_articles` | **CMS Dynamic** | `content_editor` | Daily–Weekly |
| `web_tags` | **CMS Dynamic** | `content_editor` | As needed |
| `web_article_tags` | **CMS Dynamic** | `content_editor` | With web_articles |
| `web_testimonials` | **CMS Dynamic** | `content_editor` | Monthly |
| `web_impact_metrics` | **CMS Dynamic** | `finance_staff` | Monthly |
| `web_partners` | **CMS Dynamic** | `super_admin` | Quarterly |
| `web_financial_reports` | **CMS Dynamic** | `finance_staff` | Quarterly |
| `web_team_members` | **CMS Dynamic** | `super_admin` | As needed |
| `web_faqs` | **CMS Dynamic** | `cs_staff` | Monthly |
| `web_fund_allocations` | **CMS Dynamic** | `finance_staff` | Monthly |
| `web_cms_audit_log` | System-generated | Read-only | Auto |
