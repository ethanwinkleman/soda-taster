-- ── User profiles ─────────────────────────────────────────────────────────────
-- Backs useProfile, the member list in useStashes.getMembers(), the public
-- /u/:username page, and the get_public_ratings RPC below (which reads
-- profiles.is_public).  A row is auto-created from Google metadata on first load.
--
-- Must precede get_public_ratings: that function is LANGUAGE sql, so its body is
-- parsed at CREATE time and a missing profiles table aborts a fresh run.
--
-- This block is written to be safely re-appliable on a project where profiles was
-- created by hand: the ADD COLUMNs backfill a partial table, and each policy is
-- dropped before being recreated (Postgres has no CREATE POLICY IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT        UNIQUE,
  is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username     TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username) WHERE username IS NOT NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: do I share at least one stash with this user?  SECURITY DEFINER so the
-- profiles policy doesn't re-trigger RLS on stash_members (same reason as is_stash_member).
CREATE OR REPLACE FUNCTION shares_stash_with(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stash_members me
    JOIN stash_members them ON them.stash_id = me.stash_id
    WHERE me.user_id = auth.uid() AND them.user_id = p_user_id
  );
$$;

-- Anyone (including anon) may read a profile the user has marked public — this is
-- what makes the /u/:username page work without a session.
DROP POLICY IF EXISTS "read_public_profiles" ON profiles;
CREATE POLICY "read_public_profiles" ON profiles FOR SELECT
  USING (is_public = true);

-- Members of a shared stash may read each other's profiles so names/avatars render.
DROP POLICY IF EXISTS "read_costash_profiles" ON profiles;
CREATE POLICY "read_costash_profiles" ON profiles FOR SELECT
  USING (auth.uid() = id OR shares_stash_with(id));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
