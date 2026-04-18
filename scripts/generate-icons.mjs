import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/favicon.svg'));

// Apple Touch Icon — 180×180 PNG for Safari iOS
await sharp(svg).resize(180, 180).png().toFile(join(__dirname, '../public/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png (180×180)');

// Standard favicon PNG fallback — 32×32
await sharp(svg).resize(32, 32).png().toFile(join(__dirname, '../public/favicon-32x32.png'));
console.log('✓ favicon-32x32.png (32×32)');
