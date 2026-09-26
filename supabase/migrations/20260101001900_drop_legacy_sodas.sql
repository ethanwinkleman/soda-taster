-- ── Retire the pre-stash `sodas` table ───────────────────────────────────────
-- Nothing in this repo creates, reads or writes it: it predates the stash model, and
-- the only reason anyone noticed was that it still sat in the supabase_realtime
-- publication, publishing changes to a table no client subscribes to.
--
-- Checked before writing this: RLS was on with two policies and the table was empty,
-- so this is tidying rather than a data decision. Dropping it also removes it from the
-- publication and from the API surface.
--
-- The guard is the point. A DROP is the one thing that cannot be undone by re-running a
-- migration, and `n_live_tup` — the statistic the emptiness was read from — is an
-- estimate that reads 0 on a table that was never analysed. So this counts the rows for
-- real and refuses rather than destroying anything that turns out to be there.

DO $$
DECLARE
  row_count BIGINT;
BEGIN
  IF to_regclass('public.sodas') IS NULL THEN
    RETURN;  -- already gone; re-applying this migration is a no-op
  END IF;

  EXECUTE 'SELECT count(*) FROM public.sodas' INTO row_count;

  IF row_count > 0 THEN
    RAISE EXCEPTION
      'public.sodas holds % row(s) — refusing to drop. Inspect it and remove this migration, or empty it deliberately first.',
      row_count;
  END IF;

  DROP TABLE public.sodas;
END $$;
