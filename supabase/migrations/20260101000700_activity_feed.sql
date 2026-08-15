-- ── Activity feed ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stash_activity (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stash_id     UUID        NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT        NOT NULL,
  action       TEXT        NOT NULL,
  soda_id      UUID,        -- intentionally NOT a FK: preserved after soda deletion (ACT-07)
  soda_name    TEXT,        -- snapshot of name at log time (ACT-07)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stash_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_view_activity" ON stash_activity;
CREATE POLICY "members_view_activity" ON stash_activity FOR SELECT
  USING (is_stash_member(stash_id));

DROP POLICY IF EXISTS "members_insert_activity" ON stash_activity;
CREATE POLICY "members_insert_activity" ON stash_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_stash_member(stash_id));
-- No UPDATE or DELETE policies — feed entries are read-only (ACT-06)

-- ── Activity score column ─────────────────────────────────────────────────────
-- Stores the rating value on rating_added / rating_updated events.
ALTER TABLE stash_activity ADD COLUMN IF NOT EXISTS score NUMERIC(3,1);
