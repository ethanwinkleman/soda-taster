-- ── Scope soda photo uploads to the collection they belong to ────────────────
--
-- The original policies (20260101000500) asked only `auth.role() = 'authenticated'`.
-- Objects are stored at `{stash_id}/{soda_id}` and both ids ship to the client, so any
-- signed-in user could overwrite or delete the photo on any soda in any collection they
-- had never joined — and the app uploads with `upsert: true`, so it replaced silently.
-- The check the UI implies was never written down here.
--
-- Read stays open: the bucket is public, which is what lets <img src> and the share
-- card work without signed URLs. Writing is what is being closed.

-- Parses the leading folder of an object name into a stash id, or NULL if it is not a
-- uuid. A bare `::uuid` inside a policy raises on a malformed name instead of denying
-- it, and Postgres does not promise to evaluate a guarding AND first.
CREATE OR REPLACE FUNCTION public.soda_image_stash(object_name TEXT)
RETURNS UUID LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN split_part(object_name, '/', 1)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

-- is_stash_member() is SECURITY DEFINER and returns false for a NULL id, so a malformed
-- path is denied rather than erroring. No separate auth.role() check: membership is only
-- satisfiable by a real auth.uid().
DROP POLICY IF EXISTS "soda_images_insert" ON storage.objects;
CREATE POLICY "soda_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'soda-images' AND is_stash_member(public.soda_image_stash(name)));

DROP POLICY IF EXISTS "soda_images_update" ON storage.objects;
CREATE POLICY "soda_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'soda-images' AND is_stash_member(public.soda_image_stash(name)))
  WITH CHECK (bucket_id = 'soda-images' AND is_stash_member(public.soda_image_stash(name)));

DROP POLICY IF EXISTS "soda_images_delete" ON storage.objects;
CREATE POLICY "soda_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'soda-images' AND is_stash_member(public.soda_image_stash(name)));

-- ── Size and type limits, on the bucket as well as the picker ────────────────
--
-- The client cap is a courtesy: anyone holding the anon key uploads what they like, and
-- the anon key ships in the bundle. 5 MB covers a phone photo; the app draws these at
-- 36-48px in a list, so the client also downscales before it gets here.
--
-- heic/heif are allowed deliberately. iOS hands one through when a photo is picked from
-- Files rather than Photos, and that upload works today — refusing it here would turn a
-- working path into a failed one. They render poorly, which the downscale step fixes by
-- re-encoding to JPEG; tighten this list once that is the only way in.
UPDATE storage.buckets
SET file_size_limit  = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
WHERE id = 'soda-images';
