-- Migration: add subject column to notification_templates
-- Run this in Neon console or via psql

ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS subject varchar(255);

-- Also add is_email_checkout_sent to invoices for idempotency
-- (need to run on all partition tables too)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_email_checkout_sent boolean DEFAULT false;
