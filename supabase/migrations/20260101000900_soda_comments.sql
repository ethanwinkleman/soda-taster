-- ── Soda comments ─────────────────────────────────────────────────────────────
-- Short text notes (max 500 chars) per member per soda, with one level of replies.
CREATE TABLE IF NOT EXISTS soda_comments (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  soda_id      UUID        NOT NULL REFERENCES stash_sodas(id) ON DELETE CASCADE,
  stash_id     UUID        NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  body         TEXT        NOT NULL CHECK (char_length(body) <= 500),
  parent_id    UUID        REFERENCES soda_comments(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- REPLICA IDENTITY FULL is required so that DELETE realtime events carry the
-- old row's columns (needed to filter by soda_id on the client side).
ALTER TABLE soda_comments REPLICA IDENTITY FULL;

ALTER TABLE soda_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS soda_comments_soda_id_idx ON soda_comments(soda_id);
CREATE INDEX IF NOT EXISTS soda_comments_parent_id_idx ON soda_comments(parent_id) WHERE parent_id IS NOT NULL;

DROP POLICY IF EXISTS "members_view_comments" ON soda_comments;
CREATE POLICY "members_view_comments" ON soda_comments FOR SELECT
  USING (is_stash_member(stash_id));

DROP POLICY IF EXISTS "members_insert_comments" ON soda_comments;
CREATE POLICY "members_insert_comments" ON soda_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_stash_member(stash_id));

DROP POLICY IF EXISTS "own_delete_comment" ON soda_comments;
CREATE POLICY "own_delete_comment" ON soda_comments FOR DELETE
  USING (auth.uid() = user_id);
