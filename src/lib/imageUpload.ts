/**
 * What the app will accept as a soda photo, before it reaches storage.
 *
 * These mirror the caps set on the bucket in `20260101002200_scope_soda_image_uploads`.
 * The pair is deliberate: a client-side check is a courtesy that produces a decent
 * message, and the bucket is the one that actually holds, because the anon key ships in
 * the bundle and anyone holding it uploads what they like.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * heic/heif are accepted because iOS hands one through when a photo is picked from
 * Files rather than Photos, and refusing it here would break an upload that works
 * today. They preview poorly until the image is re-encoded on the way up.
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

/** One decimal, and no trailing ".0" — "5 MB", "12.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${units[unit]}`;
}

/**
 * Why this photo cannot be used, or null if it can.
 *
 * Takes the two fields it needs rather than a `File`, so it is testable without a DOM
 * and so the same check can run on a file that has already been picked apart.
 */
export function imageRejection(file: { type: string; size: number }): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return 'That file is not an image we can use. Try a JPEG, PNG or WebP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That photo is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}
