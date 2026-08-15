-- ── Public RPC for join page (no auth required) ──────────────────────────────

CREATE OR REPLACE FUNCTION lookup_stash_by_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT, join_code TEXT, owner_id UUID)
LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT id, name, join_code, owner_id
  FROM stashes
  WHERE join_code = upper(trim(code));
$$;
