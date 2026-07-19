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

-- Hapus data lama agar seed bersih (opsional)
-- TRUNCATE TABLE public.pixel_events RESTART IDENTITY;

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
