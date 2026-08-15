-- ── Half-star rating support ──────────────────────────────────────────────────
-- Widens the score range from [1,5] whole numbers to [0.5,5.0] half steps.
ALTER TABLE stash_soda_ratings DROP CONSTRAINT IF EXISTS stash_soda_ratings_score_check;
ALTER TABLE stash_soda_ratings ADD CONSTRAINT stash_soda_ratings_score_check
  CHECK (score >= 0.5 AND score <= 5.0);
