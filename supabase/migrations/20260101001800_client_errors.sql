-- ── Errors you can actually see ──────────────────────────────────────────────
-- @vercel/analytics reports page views and Web Vitals, not exceptions, so a broken
-- deploy reached you through a person noticing rather than through a dashboard.
--
-- Three things shape this table:
--
-- 1. It is append-only from the client. INSERT is allowed, SELECT is not: the anon
--    key ships in the bundle, and a readable error log is a list of other people's
--    user ids, routes and stack traces. Reading is an admin RPC, the same boundary
--    the metrics use.
-- 2. It holds no free-form user content. A message, a stack, a route and a browser —
--    nothing a person typed. `url` is stored path-only by the client for the same
--    reason a join code should not end up here.
-- 3. Columns are length-capped in the database, not only in the client. A client-side
--    cap is a courtesy; anyone holding the anon key can post whatever they like, so
--    the storage limit has to live where it cannot be skipped.

CREATE TABLE IF NOT EXISTS public.client_errors (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Null for a signed-out crash: the landing page and the join flow can fail too.
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL CHECK (length(message) <= 500),
  stack       TEXT                 CHECK (stack IS NULL OR length(stack) <= 4000),
  -- Path only, never the full URL: query strings carry join codes.
  path        TEXT                 CHECK (path IS NULL OR length(path) <= 300),
  user_agent  TEXT                 CHECK (user_agent IS NULL OR length(user_agent) <= 400),
  -- Which build it came from, so a spike can be pinned to a deploy.
  app_version TEXT                 CHECK (app_version IS NULL OR length(app_version) <= 80),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Anyone may report; nobody may read, update or delete. A signed-in reporter has to
-- own the row they attribute, so one account cannot file errors under another.
DROP POLICY IF EXISTS "anyone_reports_errors" ON public.client_errors;
CREATE POLICY "anyone_reports_errors" ON public.client_errors FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS client_errors_created_at_idx
  ON public.client_errors(created_at DESC);

-- ── Reading them ─────────────────────────────────────────────────────────────
-- Grouped rather than raw: one broken route generates hundreds of identical rows, and
-- what an admin needs is "this started happening, this many times, since this build".
CREATE OR REPLACE FUNCTION admin_recent_errors(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  message      TEXT,
  occurrences  BIGINT,
  affected     BIGINT,
  last_seen    TIMESTAMPTZ,
  first_seen   TIMESTAMPTZ,
  sample_path  TEXT,
  app_version  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.message,
    count(*),
    -- Signed-out reports have no id to count, so this is "accounts affected", which is
    -- a floor rather than a headcount.
    count(DISTINCT e.user_id),
    max(e.created_at),
    min(e.created_at),
    (array_agg(e.path ORDER BY e.created_at DESC))[1],
    (array_agg(e.app_version ORDER BY e.created_at DESC))[1]
  FROM client_errors e
  WHERE e.created_at > now() - make_interval(days => p_days)
  GROUP BY e.message
  ORDER BY count(*) DESC, max(e.created_at) DESC
  LIMIT p_limit;
END $$;
