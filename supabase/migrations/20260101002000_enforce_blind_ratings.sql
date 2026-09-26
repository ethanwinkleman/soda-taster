-- ── Make blind rating a rule rather than a rendering choice ──────────────────
-- members_view_ratings let any member read every rating in the collection, and the app
-- decided what to draw. So the group verdict for a soda you had not rated yet was in
-- the browser the whole time — visible in the network tab, and readable directly with
-- the anon key, which ships in the bundle. Anchoring is precisely what the feature
-- exists to prevent, so the withholding has to happen here.
--
-- The rule, unchanged from the one the UI applied:
--   your own rating   — always yours to read
--   everyone else's   — once you have filed yours for that soda
--
-- has_rated_soda is SECURITY DEFINER for the usual reason in this schema: a policy on
-- stash_soda_ratings that reads stash_soda_ratings recurses. It answers only about the
-- caller's own row, so it widens nothing.

CREATE OR REPLACE FUNCTION has_rated_soda(p_soda_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM stash_soda_ratings
     WHERE soda_id = p_soda_id AND user_id = auth.uid()
  );
$$;

-- How many people have rated, without saying what they said. The count is not the
-- verdict: the list shows "2 ratings" on a soda you have not rated, and that is the
-- point — it tells you there is something to be spoiled, not what it is.
CREATE OR REPLACE FUNCTION soda_rating_count(p_soda_id UUID)
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT count(*) FROM stash_soda_ratings WHERE soda_id = p_soda_id;
$$;

DROP POLICY IF EXISTS "members_view_ratings" ON stash_soda_ratings;
CREATE POLICY "members_view_ratings" ON stash_soda_ratings FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      has_rated_soda(soda_id)
      AND EXISTS (
        SELECT 1 FROM stash_sodas ss
        JOIN stash_members sm ON sm.stash_id = ss.stash_id
        WHERE ss.id = stash_soda_ratings.soda_id AND sm.user_id = auth.uid()
      )
    )
  );
