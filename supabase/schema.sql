-- Soda Taster — unified schema
-- Run this in your Supabase SQL editor to create the new tables.
-- Existing tables (sodas, groups, group_members, etc.) are left untouched.

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stashes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code  TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stash_members (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stash_id   UUID        NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stash_id, user_id)
);

CREATE TABLE IF NOT EXISTS stash_sodas (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stash_id   UUID        NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  brand      TEXT        NOT NULL DEFAULT '',
  added_by   UUID        NOT NULL REFERENCES auth.users(id),
  in_fridge  BOOLEAN     NOT NULL DEFAULT FALSE,
  quantity   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stash_soda_ratings (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  soda_id      UUID         NOT NULL REFERENCES stash_sodas(id) ON DELETE CASCADE,
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT         NOT NULL DEFAULT '',
  score        NUMERIC(3,1) NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(soda_id, user_id)
);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE stashes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stash_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stash_sodas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stash_soda_ratings ENABLE ROW LEVEL SECURITY;

-- stashes
-- owner_id check lets the owner read back their stash immediately after INSERT,
-- before they've been added to stash_members.
CREATE POLICY "members_view_stashes"  ON stashes FOR SELECT
  USING (owner_id = auth.uid() OR is_stash_member(id));
CREATE POLICY "users_create_stashes"  ON stashes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_update_stash"    ON stashes FOR UPDATE
  USING (auth.uid() = owner_id);
CREATE POLICY "owner_delete_stash"    ON stashes FOR DELETE
  USING (auth.uid() = owner_id);

-- Helper: checks membership without triggering RLS on stash_members (avoids infinite recursion)
CREATE OR REPLACE FUNCTION is_stash_member(p_stash_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM stash_members WHERE stash_id = p_stash_id AND user_id = auth.uid());
$$;

-- stash_members
CREATE POLICY "members_view_stash_members" ON stash_members FOR SELECT
  USING (is_stash_member(stash_id));
CREATE POLICY "users_join_stashes"    ON stash_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave_or_owner_remove" ON stash_members FOR DELETE
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM stashes WHERE id = stash_members.stash_id AND owner_id = auth.uid()));

-- stash_sodas
CREATE POLICY "members_view_stash_sodas" ON stash_sodas FOR SELECT
  USING (EXISTS (SELECT 1 FROM stash_members WHERE stash_id = stash_sodas.stash_id AND user_id = auth.uid()));
CREATE POLICY "members_add_sodas" ON stash_sodas FOR INSERT
  WITH CHECK (auth.uid() = added_by AND
    EXISTS (SELECT 1 FROM stash_members WHERE stash_id = stash_sodas.stash_id AND user_id = auth.uid()));
CREATE POLICY "members_update_sodas" ON stash_sodas FOR UPDATE
  USING (EXISTS (SELECT 1 FROM stash_members WHERE stash_id = stash_sodas.stash_id AND user_id = auth.uid()));
CREATE POLICY "members_delete_sodas" ON stash_sodas FOR DELETE
  USING (EXISTS (SELECT 1 FROM stash_members WHERE stash_id = stash_sodas.stash_id AND user_id = auth.uid()));

-- stash_soda_ratings
CREATE POLICY "members_view_ratings" ON stash_soda_ratings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stash_sodas ss
    JOIN stash_members sm ON sm.stash_id = ss.stash_id
    WHERE ss.id = stash_soda_ratings.soda_id AND sm.user_id = auth.uid()
  ));
CREATE POLICY "members_add_own_rating" ON stash_soda_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM stash_sodas ss
    JOIN stash_members sm ON sm.stash_id = ss.stash_id
    WHERE ss.id = stash_soda_ratings.soda_id AND sm.user_id = auth.uid()
  ));
CREATE POLICY "own_update_rating" ON stash_soda_ratings FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "own_delete_rating" ON stash_soda_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ── Public RPC for join page (no auth required) ──────────────────────────────

CREATE OR REPLACE FUNCTION lookup_stash_by_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT, join_code TEXT, owner_id UUID)
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT id, name, join_code, owner_id
  FROM stashes
  WHERE join_code = upper(trim(code));
$$;

-- ── Public ratings RPC (no auth required) ────────────────────────────────────
-- Returns a user's ratings only when their profile is public.

CREATE OR REPLACE FUNCTION get_public_ratings(p_user_id UUID)
RETURNS TABLE (
  soda_id   UUID,
  soda_name TEXT,
  soda_brand TEXT,
  score     NUMERIC,
  rated_at  TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT r.soda_id, s.name, s.brand, r.score, r.created_at
  FROM stash_soda_ratings r
  JOIN stash_sodas s ON s.id = r.soda_id
  WHERE r.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = p_user_id AND is_public = true
    )
  ORDER BY r.score DESC, r.created_at DESC;
$$;

-- ── Stash icon support ───────────────────────────────────────────────────────
-- Run this after the initial schema to add emoji icon support for stashes.

ALTER TABLE stashes ADD COLUMN IF NOT EXISTS icon TEXT;

-- ── Soda image support ───────────────────────────────────────────────────────
-- Run this block after the initial schema to add image upload support.

ALTER TABLE stash_sodas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create the storage bucket (public — images are readable without auth).
-- If the bucket already exists this is a no-op.
INSERT INTO storage.buckets (id, name, public)
VALUES ('soda-images', 'soda-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users may upload/replace/delete images.
-- No SELECT policy needed — the bucket is public so objects are accessible by URL.
CREATE POLICY "soda_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'soda-images' AND auth.role() = 'authenticated');

CREATE POLICY "soda_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'soda-images' AND auth.role() = 'authenticated');

CREATE POLICY "soda_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'soda-images' AND auth.role() = 'authenticated');

-- ── Half-star rating support ──────────────────────────────────────────────────
-- Widens the score range from [1,5] whole numbers to [0.5,5.0] half steps.
ALTER TABLE stash_soda_ratings DROP CONSTRAINT IF EXISTS stash_soda_ratings_score_check;
ALTER TABLE stash_soda_ratings ADD CONSTRAINT stash_soda_ratings_score_check
  CHECK (score >= 0.5 AND score <= 5.0);

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

CREATE POLICY "members_view_activity" ON stash_activity FOR SELECT
  USING (is_stash_member(stash_id));

CREATE POLICY "members_insert_activity" ON stash_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_stash_member(stash_id));
-- No UPDATE or DELETE policies — feed entries are read-only (ACT-06)

-- ── Activity score column ─────────────────────────────────────────────────────
-- Stores the rating value on rating_added / rating_updated events.
ALTER TABLE stash_activity ADD COLUMN IF NOT EXISTS score NUMERIC(3,1);

-- ── Stash favorites ───────────────────────────────────────────────────────────
-- Per-user favorite flag on memberships; favorited stashes sort to the top.
ALTER TABLE stash_members ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
