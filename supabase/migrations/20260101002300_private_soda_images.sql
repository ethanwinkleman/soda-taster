-- ── Close soda photos to non-members ────────────────────────────────────────
--
-- The bucket was public, which is not the same as unguessable: paths are
-- {stash_id}/{soda_id}, so nothing could be enumerated, but any URL that ever left a
-- member's browser worked for anyone, forever, with no session and no membership.
-- 20260101002200 closed writing; this closes reading.
--
-- The app now renders photos through short-lived signed URLs (lib/imageUrls.ts), which
-- Storage only mints for a caller who may SELECT the object — so this policy is what
-- makes the signing meaningful, not merely decorative.

UPDATE storage.buckets SET public = false WHERE id = 'soda-images';

-- There was no SELECT policy at all, because a public bucket serves reads without
-- consulting one. Now that it does, membership of the collection in the leading path
-- segment is the rule, exactly as it is for writing.
DROP POLICY IF EXISTS "soda_images_select" ON storage.objects;
CREATE POLICY "soda_images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'soda-images' AND is_stash_member(public.soda_image_stash(name)));
