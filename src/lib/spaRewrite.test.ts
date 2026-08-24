import { describe, it, expect } from 'vitest';
// Imported rather than read off disk: src/ is type-checked without node types,
// so readFileSync/__dirname here would pass under vitest and fail `tsc -b`.
import vercelConfig from '../../vercel.json';

/**
 * The SPA rewrite in vercel.json must not swallow /assets/.
 *
 * Chunk filenames are content-hashed, so a tab left open across a deploy asks for
 * names the server no longer has. With a blanket `/(.*)` rewrite those requests came
 * back as index.html with a 200, and the browser refused to run HTML as a module:
 *
 *     'text/html' is not a valid JavaScript MIME type
 *
 * Reverting the pattern would silently bring that back — nothing else in the build
 * would notice, and it only shows up for users who were already on the site. Hence a
 * test on a config file.
 *
 * The client-side half of this lives in main.tsx (isChunkLoadError + recoverOnce) and
 * in the workbox navigateFallbackDenylist. Both were already correct; this was the
 * server-side hole underneath them.
 */
const config = vercelConfig as { rewrites: { source: string; destination: string }[] };

/** Does any rewrite claim this path? */
function rewritten(path: string): boolean {
  return config.rewrites.some((r) => new RegExp(`^${r.source}$`).test(path));
}

describe('vercel.json SPA rewrite', () => {
  it('has exactly one rewrite, pointing at index.html', () => {
    expect(config.rewrites).toHaveLength(1);
    expect(config.rewrites[0].destination).toBe('/index.html');
  });

  it('does not rewrite hashed build assets', () => {
    // The whole point: these must 404 when missing, not return HTML.
    expect(rewritten('/assets/index-2P091kxr.js')).toBe(false);
    expect(rewritten('/assets/StashPage-DEADBEEF.js')).toBe(false);
    expect(rewritten('/assets/index-abc123.css')).toBe(false);
    expect(rewritten('/assets/nested/thing.js')).toBe(false);
  });

  it('still rewrites application routes', () => {
    for (const path of ['/', '/stash/abc', '/stash/abc/soda/def', '/join/CODE', '/profile/someone']) {
      expect(rewritten(path), `${path} should reach the SPA`).toBe(true);
    }
  });

  it('does not rewrite a path that merely mentions assets elsewhere', () => {
    // Guards an over-broad exclusion — only the /assets/ prefix is special.
    expect(rewritten('/stash/my-assets')).toBe(true);
  });
});
