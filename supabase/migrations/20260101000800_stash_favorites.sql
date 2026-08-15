-- ── Stash favorites ───────────────────────────────────────────────────────────
-- Per-user favorite flag on memberships; favorited stashes sort to the top.
ALTER TABLE stash_members ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
