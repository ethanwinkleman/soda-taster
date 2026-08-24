-- ── Per-user activity breakdown ───────────────────────────────────────────────
-- The summary metrics say how much is happening; this says who is doing it.
--
-- Admin-gated like the other metrics RPCs — the function is the security boundary,
-- not the page. It exposes email, which is exactly why it must never be reachable
-- by an ordinary caller.

CREATE OR REPLACE FUNCTION admin_user_activity(p_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  user_id           UUID,
  user_name         TEXT,
  user_email        TEXT,
  ratings_count     BIGINT,
  sodas_count       BIGINT,
  collections_count BIGINT,
  last_active       TIMESTAMPTZ,
  signed_up         TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    -- profiles is populated from Google metadata, but a member who never opened
    -- their profile may only be named on the ratings they left.
    COALESCE(
      NULLIF(p.display_name, ''),
      (SELECT NULLIF(r.display_name, '') FROM stash_soda_ratings r
        WHERE r.user_id = u.id AND NULLIF(r.display_name, '') IS NOT NULL LIMIT 1)
    ),
    u.email,
    (SELECT count(*) FROM stash_soda_ratings r WHERE r.user_id = u.id),
    (SELECT count(*) FROM stash_sodas s       WHERE s.added_by = u.id),
    (SELECT count(*) FROM stashes st          WHERE st.owner_id = u.id),
    (SELECT max(a.created_at) FROM stash_activity a WHERE a.user_id = u.id),
    u.created_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  ORDER BY
    (SELECT count(*) FROM stash_soda_ratings r WHERE r.user_id = u.id) DESC,
    (SELECT count(*) FROM stash_sodas s       WHERE s.added_by = u.id) DESC,
    u.created_at ASC
  LIMIT p_limit;
END $$;
