-- ── Public ratings RPC (no auth required) ────────────────────────────────────
-- Returns a user's ratings only when their profile is public.

CREATE OR REPLACE FUNCTION get_public_ratings(p_user_id UUID)
RETURNS TABLE (
  soda_id   UUID,
  soda_name TEXT,
  soda_brand TEXT,
  score     NUMERIC,
  rated_at  TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT r.soda_id, s.name, s.brand, r.score, r.created_at
  FROM stash_soda_ratings r
  JOIN stash_sodas s ON s.id = r.soda_id
  WHERE r.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = p_user_id AND is_public = true
    )
  ORDER BY r.score DESC, r.created_at DESC;
$$;
