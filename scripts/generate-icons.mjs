import sharp from 'sharp';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, '../public/favicon.svg');
const publicDir = path.join(__dirname, '../public');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { size: 192, filename: 'pwa-192x192.png' },
  { size: 512, filename: 'pwa-512x512.png' },
  { size: 180, filename: 'apple-touch-icon.png' },
];

for (const { size, filename } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, filename));
  console.log(`✓ ${filename}`);
}
