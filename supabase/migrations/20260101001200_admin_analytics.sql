-- ── Admin analytics ───────────────────────────────────────────────────────────
-- Aggregate metrics for a designated super admin.
--
-- The admin flag deliberately does NOT live on profiles. The update_own_profile
-- policy lets a user update their own profiles row with no column restriction, so a
-- profiles.is_admin column would let any signed-in user promote themselves with a
-- single API call. This table has a SELECT policy and nothing else: membership can
-- only be granted from the SQL editor or with the service role.
--
-- Grant admin to someone:
--   INSERT INTO app_admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com';

CREATE TABLE IF NOT EXISTS app_admins (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- Read your own row only, so the app can decide whether to show the Admin link.
-- Reading it tells you nothing you did not already know about yourself.
DROP POLICY IF EXISTS "read_own_admin_row" ON app_admins;
CREATE POLICY "read_own_admin_row" ON app_admins FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT, UPDATE or DELETE policy on purpose. With RLS enabled and no policy,
-- those are denied for every ordinary client.

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid());
$$;

-- ── Metrics RPCs ──────────────────────────────────────────────────────────────
-- These are the security boundary, not the /admin route. A client-side app ships its
-- anon key, so hiding a page protects nothing; each function refuses to return a row
-- to a caller who is not an admin.
--
-- p_tz buckets by a real local day. created_at is timestamptz and Supabase sessions
-- run in UTC, so without it an evening in New York lands on the following day.

CREATE OR REPLACE FUNCTION admin_daily_metrics(p_days INTEGER DEFAULT 30, p_tz TEXT DEFAULT 'UTC')
RETURNS TABLE (
  bucket       DATE,
  new_users    BIGINT,
  new_sodas    BIGINT,
  new_ratings  BIGINT,
  active_users BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      ((now() AT TIME ZONE p_tz)::date - (p_days - 1))::timestamp,
      ((now() AT TIME ZONE p_tz)::date)::timestamp,
      interval '1 day'
    )::date AS d
  )
  SELECT
    days.d,
    (SELECT count(*) FROM auth.users u
       WHERE (u.created_at AT TIME ZONE p_tz)::date = days.d),
    (SELECT count(*) FROM stash_sodas s
       WHERE (s.created_at AT TIME ZONE p_tz)::date = days.d),
    (SELECT count(*) FROM stash_soda_ratings r
       WHERE (r.created_at AT TIME ZONE p_tz)::date = days.d),
    (SELECT count(DISTINCT a.user_id) FROM stash_activity a
       WHERE (a.created_at AT TIME ZONE p_tz)::date = days.d)
  FROM days
  ORDER BY days.d;
END $$;

CREATE OR REPLACE FUNCTION admin_summary_metrics()
RETURNS TABLE (
  total_users       BIGINT,
  total_collections BIGINT,
  total_sodas       BIGINT,
  total_ratings     BIGINT,
  users_7d          BIGINT,
  sodas_7d          BIGINT,
  ratings_7d        BIGINT,
  active_7d         BIGINT,
  activation_pct    NUMERIC,
  retention_pct     NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH this_week AS (
    SELECT DISTINCT a.user_id FROM stash_activity a
    WHERE a.created_at > now() - interval '7 days' AND a.user_id IS NOT NULL
  ), last_week AS (
    SELECT DISTINCT a.user_id FROM stash_activity a
    WHERE a.created_at > now() - interval '14 days'
      AND a.created_at <= now() - interval '7 days'
      AND a.user_id IS NOT NULL
  )
  SELECT
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM stashes),
    (SELECT count(*) FROM stash_sodas),
    (SELECT count(*) FROM stash_soda_ratings),
    (SELECT count(*) FROM auth.users u          WHERE u.created_at > now() - interval '7 days'),
    (SELECT count(*) FROM stash_sodas s         WHERE s.created_at > now() - interval '7 days'),
    (SELECT count(*) FROM stash_soda_ratings r  WHERE r.created_at > now() - interval '7 days'),
    (SELECT count(DISTINCT a.user_id) FROM stash_activity a WHERE a.created_at > now() - interval '7 days'),
    -- Share of signups that ever left a rating. The number that says whether the
    -- product is landing, as opposed to whether people are arriving.
    (SELECT round(100.0 * count(*) FILTER (WHERE rated.user_id IS NOT NULL)
            / nullif(count(*), 0), 1)
       FROM auth.users u
       LEFT JOIN (SELECT DISTINCT r.user_id FROM stash_soda_ratings r) rated
              ON rated.user_id = u.id),
    -- NULL until there is a prior week to compare against; that is the nullif guard,
    -- not missing data.
    (SELECT round(100.0 * (SELECT count(*) FROM this_week t JOIN last_week l USING (user_id))
            / nullif((SELECT count(*) FROM last_week), 0), 1));
END $$;

CREATE OR REPLACE FUNCTION admin_top_sodas(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  soda_name  TEXT,
  soda_brand TEXT,
  ratings    BIGINT,
  avg_score  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT s.name, s.brand, count(r.id), round(avg(r.score), 1)
  FROM stash_sodas s
  JOIN stash_soda_ratings r ON r.soda_id = s.id
  GROUP BY s.id, s.name, s.brand
  ORDER BY count(r.id) DESC, avg(r.score) DESC
  LIMIT p_limit;
END $$;
