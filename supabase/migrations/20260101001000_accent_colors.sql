-- ── Collection accent colors ──────────────────────────────────────────────────
-- Per-collection accent colour set by the proprietor; displayed as a left
-- border tint on collection cards.  Stored as a CSS hex string, e.g. '#7f1d1d'.
ALTER TABLE stashes ADD COLUMN IF NOT EXISTS accent_color TEXT;
