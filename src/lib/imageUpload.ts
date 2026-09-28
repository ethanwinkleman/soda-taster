/**
 * What the app will accept as a soda photo, and what shape it should reach storage in.
 *
 * `MAX_UPLOAD_BYTES` mirrors the cap set on the bucket in
 * `20260101002200_scope_soda_image_uploads`. The pair is deliberate: a client-side check
 * is a courtesy that produces a decent message, and the bucket is the one that actually
 * holds, because the anon key ships in the bundle and anyone holding it uploads what
 * they like.
 *
 * Pure on purpose — the canvas work lives in `imageResize.ts`, so these decisions can be
 * tested without a DOM.
 */

/** The bucket's own limit. Nothing may be uploaded above this. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * How large a file we are willing to *decode*. Downscaling means the upload cap is no
 * longer what the picker should judge a photo by — a 9 MB photo becomes ~200 KB and is
 * perfectly fine — but decoding something enormous can still take the tab down.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * Longest edge after downscaling. These are drawn at 36–48px in a list and ~150px on the
 * detail page; the largest use is the share card, rasterised at 1200×630 on a 2× screen.
 */
export const MAX_IMAGE_EDGE = 1200;

/** Below this, a correctly-sized image is left exactly as it is rather than re-encoded. */
export const REENCODE_ABOVE_BYTES = 400 * 1024;

/**
 * heic/heif are accepted because iOS hands one through when a photo is picked from Files
 * rather than Photos. Nothing else can render them, which is why they are always
 * re-encoded rather than uploaded as they arrived.
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

/** Types a browser will actually draw. A heic that fails to decode cannot be shown. */
export const RENDERABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
 * Takes the two fields it needs rather than a `File`, so it is testable without a DOM and
 * so the same check can run on a file that has already been picked apart.
 */
export function imageRejection(file: { type: string; size: number }): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return 'That file is not an image we can use. Try a JPEG, PNG or WebP.';
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `That photo is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_SOURCE_BYTES)}.`;
  }
  return null;
}

/** Fit a box inside a square of `maxEdge`, keeping aspect. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  // Round rather than floor: flooring a 1000×1 strip gives a zero-height canvas.
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Whether this image is worth re-encoding.
 *
 * A small, already-small-enough JPEG is left alone — re-encoding it costs quality for no
 * saving, and turns a PNG with transparency into one with a black background. A heic is
 * always re-encoded whatever its size, because nothing outside Apple renders one.
 */
export function needsReencode(image: { width: number; height: number; size: number; type: string }) {
  const type = image.type.toLowerCase();
  if (!RENDERABLE_IMAGE_TYPES.includes(type)) return true;
  if (image.width > MAX_IMAGE_EDGE || image.height > MAX_IMAGE_EDGE) return true;
  return image.size > REENCODE_ABOVE_BYTES;
}
