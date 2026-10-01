/**
 * Where a soda photo lives, and how to tell one of ours from someone else's.
 *
 * The bucket is private (`20260101002300`), so a photo is rendered through a signed URL
 * minted at read time rather than a permanent public one. That means what we store on
 * the row is the *object path*, not a URL — a signed URL expires, and a stored one would
 * rot.
 *
 * Pure on purpose: the signing itself needs the Supabase client, but deciding what may be
 * signed is the part that has to be right, and it is testable without one.
 */

export const SODA_IMAGE_BUCKET = 'soda-images';

/**
 * How long a signed URL stays good.
 *
 * Deliberately long. A signed URL cannot be minted offline, and the persisted query cache
 * lasts 24 hours — a one-hour token would mean a collection opened from a cold cache on a
 * plane rendered every photo broken. Seven days keeps every URL the cache can hand back
 * valid. The cost is that a leaked URL works for a week rather than a session, which is
 * still bounded, where the public bucket it replaces was forever.
 */
export const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * The object path for a newly uploaded photo.
 *
 * Versioned by upload time, so replacing a photo writes a *new* object rather than
 * overwriting one. That is what lets every cache — the browser's, the service worker's,
 * and every other member's — notice the change without a cache-busting query parameter,
 * which a signed URL cannot carry reliably (its token already varies per signing, so the
 * service worker matches these ignoring the query string).
 *
 * Flat under the collection folder, never nested: the first path segment is what the
 * storage policies read to decide who may write here, and what the collection sweep lists
 * when a collection is deleted.
 */
export function newSodaImagePath(stashId: string, sodaId: string, now = Date.now()): string {
  return `${stashId}/${sodaId}-${now}.jpg`;
}

/**
 * The object path a stored `image_url` refers to, or null if it is not ours to sign.
 *
 * Three shapes reach this, and all three are live:
 *  - a bare path, which is what uploads write now;
 *  - a full public URL, written before the bucket was private — no data migration, the
 *    path is simply read back out of it;
 *  - an external URL from a barcode lookup (Open Food Facts), which is not in our bucket
 *    at all and must be rendered exactly as it stands.
 */
export function storageObjectPath(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const marker = `/${SODA_IMAGE_BUCKET}/`;
  const at = stored.indexOf(marker);
  if (at !== -1) {
    const path = stored.slice(at + marker.length).split('?')[0].split('#')[0];
    return path || null;
  }

  // A bare path. Anything with a scheme or a leading slash is someone else's URL, and a
  // path has to name a collection folder to be signable at all.
  if (/^[a-z][a-z0-9+.-]*:/i.test(stored) || stored.startsWith('/')) return null;
  return stored.includes('/') ? stored.split('?')[0] : null;
}

/** True when this stored value is an outside URL to be rendered as it is. */
export function isExternalImage(stored: string | null | undefined): boolean {
  return !!stored && storageObjectPath(stored) === null;
}
