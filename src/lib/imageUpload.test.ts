import { describe, it, expect } from 'vitest';
import {
  imageRejection,
  formatBytes,
  fitWithin,
  needsReencode,
  MAX_SOURCE_BYTES,
  MAX_IMAGE_EDGE,
  REENCODE_ABOVE_BYTES,
} from './imageUpload';

const MB = 1024 * 1024;

describe('formatBytes', () => {
  it('drops a trailing .0 so a round limit reads as "25 MB"', () => {
    expect(formatBytes(MAX_SOURCE_BYTES)).toBe('25 MB');
  });

  it('keeps one decimal when there is one', () => {
    expect(formatBytes(Math.round(12.4 * MB))).toBe('12.4 MB');
  });

  it('climbs units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * MB)).toBe('3 GB');
  });
});

describe('imageRejection', () => {
  it('accepts an ordinary phone photo', () => {
    expect(imageRejection({ type: 'image/jpeg', size: 3 * MB })).toBeNull();
  });

  // The point of downscaling: the upload cap is no longer what the picker judges by,
  // because this becomes ~200 KB before it is sent.
  it('accepts a photo larger than the bucket cap, since it will be downscaled', () => {
    expect(imageRejection({ type: 'image/jpeg', size: 9 * MB })).toBeNull();
  });

  it('accepts heic, which iOS hands through from the Files picker', () => {
    expect(imageRejection({ type: 'image/heic', size: 2 * MB })).toBeNull();
  });

  it('ignores case in the type, which some browsers vary', () => {
    expect(imageRejection({ type: 'IMAGE/JPEG', size: 1 * MB })).toBeNull();
  });

  it('names the size and the limit, so the message is actionable', () => {
    const why = imageRejection({ type: 'image/jpeg', size: Math.round(31.5 * MB) });
    expect(why).toContain('31.5 MB');
    expect(why).toContain('25 MB');
  });

  it('takes a file exactly at the decode limit', () => {
    expect(imageRejection({ type: 'image/png', size: MAX_SOURCE_BYTES })).toBeNull();
  });

  it('rejects one byte over', () => {
    expect(imageRejection({ type: 'image/png', size: MAX_SOURCE_BYTES + 1 })).not.toBeNull();
  });

  it('rejects a non-image', () => {
    expect(imageRejection({ type: 'application/pdf', size: 1000 })).toContain('not an image');
  });

  // Some browsers report '' for a type they do not recognise. Letting that through
  // means the bucket rejects it instead, with a message nobody can act on.
  it('rejects an unknown type rather than hoping', () => {
    expect(imageRejection({ type: '', size: 1000 })).toContain('not an image');
  });

  it('rejects an empty file', () => {
    expect(imageRejection({ type: 'image/jpeg', size: 0 })).toBe('That file is empty.');
  });

  // Checked before the size, so a 40 MB PDF is not described as a photo.
  it('reports the type first when a file fails both', () => {
    expect(imageRejection({ type: 'application/pdf', size: 40 * MB })).toContain('not an image');
  });
});

describe('fitWithin', () => {
  it('leaves an image already within the box alone', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('never upscales a small image', () => {
    expect(fitWithin(40, 30)).toEqual({ width: 40, height: 30 });
  });

  it('scales a landscape phone photo by its longest edge', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_IMAGE_EDGE, height: 900 });
  });

  it('scales a portrait one the same way', () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 900, height: MAX_IMAGE_EDGE });
  });

  it('keeps a square square', () => {
    expect(fitWithin(3000, 3000)).toEqual({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE });
  });

  // Flooring here gives a zero-height canvas, which draws nothing at all.
  it('never rounds an extreme aspect ratio down to zero', () => {
    const out = fitWithin(10000, 1);
    expect(out.width).toBe(MAX_IMAGE_EDGE);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });

  it('takes an image exactly at the edge as-is', () => {
    expect(fitWithin(MAX_IMAGE_EDGE, 400)).toEqual({ width: MAX_IMAGE_EDGE, height: 400 });
  });
});

describe('needsReencode', () => {
  const small = { width: 600, height: 400, size: 100 * 1024 };

  it('leaves a small, correctly-sized JPEG alone', () => {
    expect(needsReencode({ ...small, type: 'image/jpeg' })).toBe(false);
  });

  // Re-encoding it would cost quality for no saving, and flatten PNG transparency onto
  // a black background.
  it('leaves a small PNG alone', () => {
    expect(needsReencode({ ...small, type: 'image/png' })).toBe(false);
  });

  it('re-encodes anything over the edge limit', () => {
    expect(needsReencode({ width: 4032, height: 3024, size: 100 * 1024, type: 'image/jpeg' })).toBe(true);
  });

  it('re-encodes a small-dimensioned but heavy file', () => {
    expect(needsReencode({ ...small, size: REENCODE_ABOVE_BYTES + 1, type: 'image/jpeg' })).toBe(true);
  });

  // Nothing outside Apple draws a heic, so size and dimensions are beside the point.
  it('always re-encodes heic, however small', () => {
    expect(needsReencode({ width: 100, height: 100, size: 2 * 1024, type: 'image/heic' })).toBe(true);
    expect(needsReencode({ width: 100, height: 100, size: 2 * 1024, type: 'image/heif' })).toBe(true);
  });
});
