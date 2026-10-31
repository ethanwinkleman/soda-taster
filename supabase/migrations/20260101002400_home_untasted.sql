-- ── What is waiting on the viewer, across every collection they are in ───────
--
-- The collections page was a filing cabinet: it answered "what do I own" and never
-- "what now". The one thing it could not answer without a round trip per collection is
-- the most interesting: sodas the rest of the group has already scored and the viewer
-- has not, whose verdicts stay sealed until they rate. That is the strongest reason the
-- app has to be opened, and nothing surfaced it.
--
-- One row per unrated soda, across all of the viewer's collections, in one call.
--
-- SECURITY INVOKER (the default) on purpose, exactly as stash_soda_list is: RLS still
-- applies, so this can only return sodas the caller was already allowed to read. The
-- rating count comes from soda_rating_count because a plain count(*) under the
-- blind-rating policy counts only the rows the caller may read, which is their own.
--
-- No scores are returned at all. The viewer has not rated these, so every one of them
-- is sealed by definition — sending a number here would reopen the hole 20260101002000
-- closed. The count is enough to say "three people have an opinion you cannot see yet".

CREATE OR REPLACE FUNCTION home_untasted(p_limit INTEGER DEFAULT 24)
RETURNS TABLE (
  id           UUID,
  stash_id     UUID,
  stash_name   TEXT,
  name         TEXT,
  brand        TEXT,
  image_url    TEXT,
  in_fridge    BOOLEAN,
  quantity     INTEGER,
  created_at   TIMESTAMPTZ,
  rating_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = public AS $$
  SELECT
    s.id, s.stash_id, st.name AS stash_name, s.name, s.brand, s.image_url,
    s.in_fridge, s.quantity, s.created_at,
    soda_rating_count(s.id) AS rating_count
  FROM stash_sodas s
  JOIN stashes st ON st.id = s.stash_id
  WHERE NOT EXISTS (
    SELECT 1 FROM stash_soda_ratings r
    WHERE r.soda_id = s.id AND r.user_id = auth.uid()
  )
  ORDER BY
    -- Sealed first: someone else has rated it, so rating it reveals something.
    (soda_rating_count(s.id) > 0) DESC,
    -- Then what is actually in the fridge, because that is what can be opened now.
    (s.in_fridge AND s.quantity > 0) DESC,
    s.created_at DESC
  LIMIT GREATEST(p_limit, 0);
$$;
