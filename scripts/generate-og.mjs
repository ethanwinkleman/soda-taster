// Renders scripts/og-template.html into public/og.png — the 1200×630 card that
// Facebook, iMessage, Slack and X show when the site is linked.
//
// Not part of `npm run build`: the output is committed, and this needs a browser.
//   npm i -D playwright && npx playwright install chromium
//   node scripts/generate-og.mjs
//
// CHROMIUM_PATH and OG_FONT_DIR (below) let it run against an existing browser and
// without network access.
//
// Shot at 2× and downsampled, which is visibly cleaner on the phone screenshot's
// small type than rendering straight to 1200×630.

import { readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/og.png');
const TMP = join(ROOT, 'public/.og-2x.png');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed — run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// Served over HTTP rather than opened as file://, because a file:// page is treated as
// an opaque origin and the webfonts never load — and document.fonts.check() answers
// `true` even when nothing loaded, so the fallback is easy to miss. The check below is
// the one that actually tells you.
const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  let body;
  // Read before writing the header — otherwise a missing file throws after the 200 is
  // already on the wire, and the failure reads as ERR_HTTP_HEADERS_SENT instead of 404.
  try {
    body = readFileSync(path);
  } catch {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

// CHROMIUM_PATH lets you point at a Chromium you already have rather than a second
// copy downloaded by `npx playwright install`.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:${port}/scripts/og-template.html`, { waitUntil: 'networkidle' });

// Escape hatch for machines that cannot reach fonts.googleapis.com (CI, a sandbox, an
// offline laptop): point OG_FONT_DIR at a folder of woff2 files named Family-Weight.woff2
// — e.g. Fredoka-700.woff2, PlusJakartaSans-500.woff2 — and they are inlined instead.
if (process.env.OG_FONT_DIR) {
  const dir = resolve(process.env.OG_FONT_DIR);
  const faces = readdirSync(dir)
    .filter((f) => f.endsWith('.woff2'))
    .map((f) => {
      const [rawFamily, weight] = f.replace('.woff2', '').split('-');
      // PlusJakartaSans → Plus Jakarta Sans
      const family = rawFamily.replace(/([a-z])([A-Z])/g, '$1 $2');
      const b64 = readFileSync(join(dir, f)).toString('base64');
      return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
             `font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    });
  await page.addStyleTag({ content: faces.join('\n') });
}

await page.evaluate(() => document.fonts.ready);

const families = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`));
if (!families.some((f) => f.startsWith('Fredoka') && f.endsWith('loaded'))) {
  console.error('Fredoka did not load — the card would be set in a fallback face. Aborting.');
  console.error('  faces seen:', families.length ? families.join(', ') : '(none)');
  await browser.close();
  server.close();
  process.exit(1);
}

await page.screenshot({ path: TMP });
await browser.close();
server.close();

await sharp(TMP).resize(1200, 630).png({ compressionLevel: 9, palette: false }).toFile(OUT);
unlinkSync(TMP);

console.log(`✓ public/og.png (1200×630, ${Math.round(readFileSync(OUT).length / 1024)} KB)`);
