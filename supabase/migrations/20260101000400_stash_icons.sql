-- ── Stash icon support ───────────────────────────────────────────────────────
-- Run this after the initial schema to add emoji icon support for stashes.

ALTER TABLE stashes ADD COLUMN IF NOT EXISTS icon TEXT;
