import { describe, it, expect } from 'vitest';
import { storageObjectPath, isExternalImage, newSodaImagePath } from './imageUrls';

const STASH = '11111111-1111-1111-1111-111111111111';
const SODA = '22222222-2222-2222-2222-222222222222';

describe('newSodaImagePath', () => {
  it('sits flat under the collection folder, because the policy reads that segment', () => {
    const path = newSodaImagePath(STASH, SODA, 1700000000000);
    expect(path.split('/')[0]).toBe(STASH);
    expect(path.split('/')).toHaveLength(2);
  });

  // Replacing a photo has to write a new object, or every cache holding the old one —
  // including other members' service workers — keeps serving it.
  it('names a different object each time a photo is replaced', () => {
    expect(newSodaImagePath(STASH, SODA, 1)).not.toBe(newSodaImagePath(STASH, SODA, 2));
  });
});

describe('storageObjectPath', () => {
  it('reads the path back out of a public URL written before the bucket was private', () => {
    expect(storageObjectPath(
      `https://abc.supabase.co/storage/v1/object/public/soda-images/${STASH}/${SODA}`,
    )).toBe(`${STASH}/${SODA}`);
  });

  // Those legacy rows carry the old cache-buster.
  it('drops a query string', () => {
    expect(storageObjectPath(
      `https://abc.supabase.co/storage/v1/object/public/soda-images/${STASH}/${SODA}?t=123`,
    )).toBe(`${STASH}/${SODA}`);
  });

  it('reads one back out of an already-signed URL', () => {
    expect(storageObjectPath(
      `https://abc.supabase.co/storage/v1/object/sign/soda-images/${STASH}/${SODA}-9.jpg?token=xy`,
    )).toBe(`${STASH}/${SODA}-9.jpg`);
  });

  it('passes through a bare path, which is what uploads write now', () => {
    expect(storageObjectPath(`${STASH}/${SODA}-9.jpg`)).toBe(`${STASH}/${SODA}-9.jpg`);
  });

  // A barcode lookup stores the manufacturer's own image. Signing is not ours to do.
  it('refuses an external URL', () => {
    expect(storageObjectPath('https://images.openfoodfacts.org/images/products/1.jpg')).toBeNull();
    expect(isExternalImage('https://images.openfoodfacts.org/images/products/1.jpg')).toBe(true);
  });

  it('refuses anything with a scheme that is not in our bucket', () => {
    expect(storageObjectPath('https://example.com/soda.jpg')).toBeNull();
    expect(storageObjectPath('data:image/png;base64,AAAA')).toBeNull();
    expect(storageObjectPath('blob:https://app.example/1234')).toBeNull();
  });

  // A path with no folder cannot name a collection, so nothing could authorise it.
  it('refuses a bare filename with no collection folder', () => {
    expect(storageObjectPath('loose.jpg')).toBeNull();
  });

  it('refuses an absolute path', () => {
    expect(storageObjectPath('/etc/passwd')).toBeNull();
  });

  it('handles nothing stored', () => {
    expect(storageObjectPath(null)).toBeNull();
    expect(storageObjectPath(undefined)).toBeNull();
    expect(storageObjectPath('')).toBeNull();
    expect(isExternalImage(null)).toBe(false);
  });
});
