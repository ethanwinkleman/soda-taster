-- ── Realtime, made reproducible ──────────────────────────────────────────────
-- Four hooks subscribe to postgres_changes, but nothing in this repo ever put the
-- tables into the publication Realtime reads from. That was a dashboard toggle: live
-- updates worked on the project where someone had flipped it and silently did nothing
-- anywhere else, including a fresh project restored from these migrations.
--
-- Idempotent on both counts, since a project that already has the toggle must not
-- error here.

DO $$
BEGIN
  -- Supabase projects ship with this publication. A plain Postgres (the migration
  -- verifier, a local restore) does not.
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stash_sodas', 'stash_soda_ratings', 'soda_comments', 'stash_activity'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ── Why soda_comments needs REPLICA IDENTITY FULL ────────────────────────────
-- useSodaComments subscribes to DELETE with `filter: soda_id=eq.<id>`. Under the
-- default replica identity a DELETE writes only the primary key to the WAL, so the
-- payload Realtime matches that filter against has no soda_id at all and the filter can
-- never match. A comment deleted by one member therefore stayed on everyone else's
-- screen until they refetched for some other reason.
--
-- Decoded from a local WAL to be sure of it:
--   default:  table public.soda_comments: DELETE: id[uuid]:'cb75…'
--   full:     table public.soda_comments: DELETE: id[uuid]:'7d1b…' soda_id[uuid]:'2222…' body[text]:'second'
--
-- FULL writes the whole old row to the WAL, so it is applied only where a filter needs
-- it. The other three subscriptions are unfiltered and do not. Anything that later
-- filters a DELETE on those tables — which the planned per-collection filtering will —
-- needs the same treatment on that table, and should say so here.
ALTER TABLE public.soda_comments REPLICA IDENTITY FULL;
