import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/favicon.svg'));

// Apple Touch Icon — 180×180 PNG for Safari iOS
await sharp(svg).resize(180, 180).png().toFile(join(__dirname, '../public/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png (180×180)');

// PWA icons required by Android install prompt
await sharp(svg).resize(192, 192).png().toFile(join(__dirname, '../public/icon-192.png'));
console.log('✓ icon-192.png (192×192)');

await sharp(svg).resize(512, 512).png().toFile(join(__dirname, '../public/icon-512.png'));
console.log('✓ icon-512.png (512×512)');
