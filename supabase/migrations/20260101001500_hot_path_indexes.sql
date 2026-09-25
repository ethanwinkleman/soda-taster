-- ── Indexes for the reads every session makes ────────────────────────────────
-- Postgres indexes primary keys and UNIQUE constraints, not foreign keys, so the
-- schema arrived with covering indexes only where a UNIQUE happened to provide one.
-- Everything below is a filter the app runs on a hot path with nothing to use, which
-- means a sequential scan whose cost grows with the whole table rather than with the
-- rows returned.
--
-- All of these are additive and change no behaviour. CONCURRENTLY is deliberately not
-- used: it cannot run inside a transaction block, and these tables are small enough
-- today that a plain build is quick. Revisit that if they grow before this is applied.

-- loadStashes, on every app open. UNIQUE(stash_id, user_id) cannot serve this:
-- user_id is the trailing column, so a lookup by user alone scans.
CREATE INDEX IF NOT EXISTS stash_members_user_id_idx
  ON stash_members(user_id);

-- loadSodas, on every collection page.
CREATE INDEX IF NOT EXISTS stash_sodas_stash_id_idx
  ON stash_sodas(stash_id);

-- useMyRatings (palate profile, the onboarding checklist) and admin_user_activity.
-- UNIQUE(soda_id, user_id) covers soda_id, not user_id.
CREATE INDEX IF NOT EXISTS stash_soda_ratings_user_id_idx
  ON stash_soda_ratings(user_id);

-- The activity feed and the home page's recent-ratings strip: filtered by stash,
-- ordered by time, limited. Ordering the index the way the query reads it lets the
-- limit stop early instead of sorting the whole matching set.
CREATE INDEX IF NOT EXISTS stash_activity_stash_id_created_at_idx
  ON stash_activity(stash_id, created_at DESC);

-- admin_user_activity counts these per user, one correlated subquery each.
CREATE INDEX IF NOT EXISTS stash_sodas_added_by_idx
  ON stash_sodas(added_by);

CREATE INDEX IF NOT EXISTS stashes_owner_id_idx
  ON stashes(owner_id);

-- admin_user_activity's last_active: max(created_at) per user.
CREATE INDEX IF NOT EXISTS stash_activity_user_id_idx
  ON stash_activity(user_id);
