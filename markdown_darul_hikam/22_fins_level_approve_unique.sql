-- ============================================================================
-- 22_fins_level_approve_unique.sql
-- FINS > Home > Setting Configuration > Level Approve
-- Adds a UNIQUE constraint on fins_level_approve.jabatan so the admin CRUD
-- can upsert (ON CONFLICT) a row per jabatan — every fins_jabatan row is
-- listed on the Level Approve screen (LEFT JOIN), including ones with no
-- fins_level_approve row yet ("Belum diatur"); saving one for the first time
-- inserts, editing an existing one updates, keyed by jabatan name.
-- Applied to the live Neon DB on 2026-09-12.
-- ============================================================================

ALTER TABLE fins_level_approve ADD CONSTRAINT fins_level_approve_jabatan_key UNIQUE (jabatan);
