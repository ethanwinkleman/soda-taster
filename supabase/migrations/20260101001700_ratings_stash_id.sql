-- ── A collection id on ratings, so subscriptions can filter ──────────────────
-- useStashSodas subscribes to every row change in stash_soda_ratings app-wide,
-- because a rating had no column naming the collection it belongs to and
-- postgres_changes can only filter on the row's own columns. Supabase authorises
-- postgres_changes per subscriber, so one rating cost a policy evaluation against
-- every connected client and a refetch for each one that passed.
--
-- The column is derived, never supplied: a trigger fills it from the soda on every
-- insert and update, ignoring whatever the client sent. That matters more than the
-- usual denormalisation tidiness, because this value now decides which subscribers a
-- change is delivered to — a forged one would route a rating into someone else's
-- collection channel. (RLS still gates delivery, so the worst case was a wasted
-- message, but a routing key the client can write is a bad thing to leave lying about.)

ALTER TABLE public.stash_soda_ratings
  ADD COLUMN IF NOT EXISTS stash_id UUID REFERENCES public.stashes(id) ON DELETE CASCADE;

-- SECURITY DEFINER so RLS on stash_sodas cannot turn a legitimate rating into a
-- NOT NULL violation. It widens nothing: the INSERT policy on this table already
-- proves the caller is a member of the soda's collection, and all this reads is the
-- stash_id of the soda being rated.
CREATE OR REPLACE FUNCTION public.set_rating_stash_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  SELECT s.stash_id INTO NEW.stash_id FROM stash_sodas s WHERE s.id = NEW.soda_id;
  RETURN NEW;
END $$;

UPDATE public.stash_soda_ratings r
   SET stash_id = s.stash_id
  FROM public.stash_sodas s
 WHERE s.id = r.soda_id
   AND r.stash_id IS DISTINCT FROM s.stash_id;

-- Safe: stash_soda_ratings.soda_id is a FK with ON DELETE CASCADE, so no rating can
-- outlive its soda and the backfill above reaches every row.
ALTER TABLE public.stash_soda_ratings ALTER COLUMN stash_id SET NOT NULL;

-- Fires on every insert and every update, not just when soda_id changes: re-deriving
-- unconditionally is what makes the column impossible to write from the client.
DROP TRIGGER IF EXISTS set_rating_stash_id_trg ON public.stash_soda_ratings;
CREATE TRIGGER set_rating_stash_id_trg
  BEFORE INSERT OR UPDATE ON public.stash_soda_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_rating_stash_id();

-- ── Replica identity for the filtered DELETE subscriptions ───────────────────
-- Same rule as soda_comments in 20260101001600: a DELETE writes only the primary key
-- to the WAL under the default identity, so a filter on stash_id can never match one.
-- useStashSodas filters '*' (which includes DELETE) on stash_soda_ratings, and
-- useStashes filters DELETE on stash_sodas.
--
-- FULL writes the whole old row, so this is a real WAL cost on two busy tables. It buys
-- back far more than it spends: without the filters, every client was woken for every
-- row change in them.
ALTER TABLE public.stash_soda_ratings REPLICA IDENTITY FULL;
ALTER TABLE public.stash_sodas        REPLICA IDENTITY FULL;
