#!/usr/bin/env node
// Create the SAME alpha-transparent logo for Windows, Android and iOS.
// Do not reintroduce the old opaque square as an Android maskable icon.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const GENERATED_ICON_NAMES = Object.freeze(["icon-any-16.png","icon-any-32.png","icon-any-180.png","icon-any-192.png","icon-any-512.png"]);
export async function generateTransparentAppIcons(targetRoot) {
  const root = path.resolve(targetRoot);
  const folder = path.join(root, 'assets', 'app-icons');
  const source = path.join(folder, 'icon-any-source-128.png');
  if (!fs.existsSync(source)) throw Error('Missing transparent source icon');
  const meta = await sharp(source).metadata();
  if (meta.width !== 128 || meta.height !== 128 || !meta.hasAlpha)
    throw Error('Transparent icon source must be 128x128 with alpha');
  for (const size of [16,32,180,192,512]) {
    const destination = path.join(folder, 'icon-any-' + size + '.png');
    await sharp(source)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, palette: false })
      .toFile(destination);
    const output = await sharp(destination).metadata();
    if (output.width !== size || output.height !== size || !output.hasAlpha)
      throw Error('Transparent icon output invalid: ' + destination);
  }
  console.log('[pwa-transparent-icons] PASS: 16/32/180/192/512 PNG alpha assets');
}
if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
  await generateTransparentAppIcons(process.argv[2] || process.cwd());
}
