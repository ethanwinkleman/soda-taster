-- ── Tasting notes on ratings ──────────────────────────────────────────────────
-- Optional free-text note (max 300 chars) attached to a member's score.
ALTER TABLE stash_soda_ratings ADD COLUMN IF NOT EXISTS notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 300);
