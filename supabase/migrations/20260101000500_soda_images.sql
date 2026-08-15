-- ── Soda image support ───────────────────────────────────────────────────────
-- Run this block after the initial schema to add image upload support.

ALTER TABLE stash_sodas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create the storage bucket (public — images are readable without auth).
-- If the bucket already exists this is a no-op.
INSERT INTO storage.buckets (id, name, public)
VALUES ('soda-images', 'soda-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users may upload/replace/delete images.
-- No SELECT policy needed — the bucket is public so objects are accessible by URL.
DROP POLICY IF EXISTS "soda_images_insert" ON storage.objects;
CREATE POLICY "soda_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'soda-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "soda_images_update" ON storage.objects;
CREATE POLICY "soda_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'soda-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "soda_images_delete" ON storage.objects;
CREATE POLICY "soda_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'soda-images' AND auth.role() = 'authenticated');
