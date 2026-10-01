import { supabase } from './supabase';
import type { Soda } from '../types/stash';
import { SODA_IMAGE_BUCKET, SIGNED_URL_TTL_SECONDS, storageObjectPath } from './imageUrls';

/**
 * Turning stored object paths into URLs a browser may fetch.
 *
 * The bucket is private, so Storage mints a signed URL only for a caller who may SELECT
 * the object — the membership policy in `20260101002300` is what gives that meaning.
 */

/** Signed in batches: one round trip for a whole collection rather than one per photo. */
const BATCH = 100;

export async function signSodaImages(paths: string[]): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  const unique = [...new Set(paths)];

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const { data, error } = await supabase.storage
      .from(SODA_IMAGE_BUCKET)
      .createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);
    // Deliberately not thrown, unlike a failed read. A photo that will not sign is a
    // missing thumbnail; the collection behind it still loads, and failing the whole
    // query for one of them would be a far worse trade.
    if (error || !data) continue;
    for (const row of data) {
      if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
    }
  }
  return signed;
}

/**
 * Rewrites each soda's `imageUrl` into something renderable, in place.
 *
 * An external URL from a barcode lookup is left exactly as it is — it is not in our
 * bucket and is not ours to sign. Anything of ours that fails to sign becomes null, so
 * the card draws its placeholder rather than a broken image.
 */
export async function attachSignedImages(sodas: Soda[]): Promise<void> {
  const paths = sodas
    .map((s) => storageObjectPath(s.imageUrl))
    .filter((p): p is string => p !== null);
  if (paths.length === 0) return;

  const signed = await signSodaImages(paths);
  for (const soda of sodas) {
    const path = storageObjectPath(soda.imageUrl);
    if (path === null) continue;
    soda.imageUrl = signed.get(path) ?? null;
  }
}

/** One photo, for the paths that write one and want to show it immediately. */
export async function signOne(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(SODA_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
