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
CREATE POLICY "members_view_stashes"  ON stashes FOR SELECT
  USING (EXISTS (SELECT 1 FROM stash_members WHERE stash_id = stashes.id AND user_id = auth.uid()));
CREATE POLICY "users_create_stashes"  ON stashes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_update_stash"    ON stashes FOR UPDATE
  USING (auth.uid() = owner_id);
CREATE POLICY "owner_delete_stash"    ON stashes FOR DELETE
  USING (auth.uid() = owner_id);

-- Helper: checks membership without triggering RLS on stash_members (avoids infinite recursion)
CREATE OR REPLACE FUNCTION is_stash_member(p_stash_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
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
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, join_code, owner_id
  FROM stashes
  WHERE join_code = upper(trim(code));
$$;
