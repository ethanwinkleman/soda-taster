-- ── One row per soda, instead of one row per rating ──────────────────────────
-- loadSodas fetched every rating row in the collection — uuid, rater name, notes and
-- timestamps — to end up drawing a number and a count. The charts need the individual
-- scores, so the rows cannot simply be collapsed to an average; they can be collapsed
-- to an array of numbers, which is the same information at a fraction of the size.
--
-- The second reason matters more. `select('*')` on stash_soda_ratings sent the scores
-- of sodas the viewer has not rated yet, and the blind-rating rule was applied only
-- when rendering. Anyone could read the group verdict out of the network tab before
-- filing their own — which is exactly the anchoring the feature exists to prevent. Here
-- the withholding happens in the database, so the numbers never reach the browser.
--
-- SECURITY INVOKER (the default) on purpose: RLS still applies to the caller, so this
-- can only ever return sodas they were already allowed to read. It narrows what is
-- sent, it does not widen it.

CREATE OR REPLACE FUNCTION stash_soda_list(p_stash_id UUID)
RETURNS TABLE (
  id            UUID,
  stash_id      UUID,
  name          TEXT,
  brand         TEXT,
  added_by      UUID,
  in_fridge     BOOLEAN,
  quantity      INTEGER,
  image_url     TEXT,
  created_at    TIMESTAMPTZ,
  rating_count  BIGINT,
  comment_count BIGINT,
  -- The viewer's own rating, always returned: it is their data, and its presence is
  -- what decides whether the rest is revealed.
  my_rating_id  UUID,
  my_score      NUMERIC,
  my_notes      TEXT,
  my_created_at TIMESTAMPTZ,
  -- Everyone else's scores, and the group average — withheld until the viewer has
  -- rated. Scores only: no names, no notes, nothing the list does not draw.
  other_scores  NUMERIC[],
  avg_score     NUMERIC
)
LANGUAGE sql STABLE
SET search_path = public AS $$
  SELECT
    s.id, s.stash_id, s.name, s.brand, s.added_by, s.in_fridge, s.quantity,
    s.image_url, s.created_at,
    soda_rating_count(s.id),
    (SELECT count(*) FROM soda_comments c WHERE c.soda_id = s.id),
    mine.id, mine.score, mine.notes, mine.created_at,
    CASE WHEN mine.id IS NULL THEN NULL ELSE (
      SELECT array_agg(r.score ORDER BY r.created_at)
        FROM stash_soda_ratings r
       WHERE r.soda_id = s.id AND r.user_id <> auth.uid()
    ) END,
    CASE WHEN mine.id IS NULL THEN NULL ELSE (
      SELECT round(avg(r.score), 1) FROM stash_soda_ratings r WHERE r.soda_id = s.id
    ) END
  FROM stash_sodas s
  LEFT JOIN stash_soda_ratings mine
         ON mine.soda_id = s.id AND mine.user_id = auth.uid()
  WHERE s.stash_id = p_stash_id
  ORDER BY s.created_at DESC;
$$;
