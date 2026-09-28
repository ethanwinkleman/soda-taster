import { describe, it, expect } from 'vitest';
import { imageRejection, formatBytes, MAX_IMAGE_BYTES } from './imageUpload';

const MB = 1024 * 1024;

describe('formatBytes', () => {
  it('drops a trailing .0 so the limit reads as "5 MB"', () => {
    expect(formatBytes(MAX_IMAGE_BYTES)).toBe('5 MB');
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

  it('accepts heic, which iOS hands through from the Files picker', () => {
    expect(imageRejection({ type: 'image/heic', size: 2 * MB })).toBeNull();
  });

  it('ignores case in the type, which some browsers vary', () => {
    expect(imageRejection({ type: 'IMAGE/JPEG', size: 1 * MB })).toBeNull();
  });

  it('names the size and the limit, so the message is actionable', () => {
    const why = imageRejection({ type: 'image/jpeg', size: Math.round(12.4 * MB) });
    expect(why).toContain('12.4 MB');
    expect(why).toContain('5 MB');
  });

  it('takes a file exactly at the limit', () => {
    expect(imageRejection({ type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it('rejects one byte over', () => {
    expect(imageRejection({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).not.toBeNull();
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
