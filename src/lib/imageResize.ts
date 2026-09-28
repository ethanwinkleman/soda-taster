import {
  MAX_IMAGE_EDGE,
  MAX_UPLOAD_BYTES,
  RENDERABLE_IMAGE_TYPES,
  fitWithin,
  formatBytes,
  needsReencode,
} from './imageUpload';

/**
 * Downscales a picked photo before it goes anywhere near the network.
 *
 * A phone photo is 3–5 MB and the app draws it at 36–48px in a list. Quick Add is built
 * for tasting events, which is exactly where the connection is worst, so the upload that
 * matters most is the one where those megabytes hurt. 1200px on the longest edge at
 * quality 0.82 lands around 150–250 KB.
 *
 * It also fixes heic: iOS hands one through from the Files picker, nothing outside Apple
 * draws one, and re-encoding to JPEG is what makes it displayable at all.
 *
 * The decisions live in `imageUpload.ts`; this is the canvas around them.
 */

const JPEG_QUALITY = 0.82;

/** Decode to something drawable, preferring the path that does not need the DOM. */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}

/**
 * Returns the file to upload, or why it cannot be used.
 *
 * When the browser cannot decode the image, the original is used instead — but only if
 * it is something a browser can draw and is within the bucket's cap. A decode failure on
 * a heic means the app could never have displayed it, so that is a rejection rather than
 * an upload of something broken.
 */
export async function prepareImageForUpload(file: File): Promise<{ file: File } | { error: string }> {
  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    return fallback(file);
  }

  try {
    if (!needsReencode({ width: decoded.width, height: decoded.height, size: file.size, type: file.type })) {
      return { file };
    }
    const { width, height } = fitWithin(decoded.width, decoded.height, MAX_IMAGE_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback(file);
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await toBlob(canvas);
    if (!blob) return fallback(file);

    // Re-encoding a small PNG can come out larger than it went in. Keep whichever is
    // smaller, as long as the original is something a browser can draw.
    if (blob.size >= file.size && RENDERABLE_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return { file };
    }
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return { file: new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }) };
  } catch {
    return fallback(file);
  } finally {
    decoded.release();
  }
}

function fallback(file: File): { file: File } | { error: string } {
  if (!RENDERABLE_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return { error: 'We could not read that image. Try saving it as a JPEG first.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `That photo is ${formatBytes(file.size)} and could not be resized — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  }
  return { file };
}
