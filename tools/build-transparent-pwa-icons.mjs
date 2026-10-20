#!/usr/bin/env node
// Preserve transparent desktop/Android symbols; generate a compatible iOS fallback from the proven legacy logo.
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
  // iOS (including Edge Add to Home Screen) may reject fully transparent launcher artwork.
  // Use the SAME proven icon-180.png artwork that was used by RaK 2.0.19.
  const iosSource = path.join(folder, 'icon-180.png');
  if (!fs.existsSync(iosSource)) throw Error('Missing previously working iOS icon');
  const iosDestination = path.join(root, 'apple-touch-icon.png');
  await sharp(iosSource)
    .resize(180, 180, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .flatten({ background: '#0b0f0c' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(iosDestination);
  const ios = await sharp(iosDestination).metadata();
  if (ios.width !== 180 || ios.height !== 180 || ios.hasAlpha)
    throw Error('Invalid opaque Apple touch icon');
  // iOS 27.2 can show only the first title letter when the Home Screen icon
  // is fetched by URL, even when apple-touch-icon.png itself is valid.
  // Keep the normal fast app shell unchanged and offer a tiny, one-time
  // installation page with the PNG embedded in the HTML as a data URI.
  const iconData = 'data:image/png;base64,' + fs.readFileSync(iosDestination).toString('base64');
  const html = `<!doctype html>
<html lang="cs"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0f0c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Rotace a Kalkulačky">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="${iconData}">
<title>Rotace a Kalkulačky</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0b0f0c;color:#eaf4ee;font-family:system-ui,-apple-system,Arial,sans-serif}main{max-width:380px;margin:24px;text-align:center}img{width:120px;height:120px;border-radius:25px}h1{font-size:1.55rem}p{line-height:1.55;color:#cbdad1}a{color:#89e5ba}</style>
</head><body><main>
<img width="120" height="120" src="./apple-touch-icon.png?v=2.0.27-ios2" alt="Logo RaK">
<h1>RaK – instalace na iPhone</h1>
<p>V Microsoft Edge otevři nabídku Sdílet a zvol Přidat na plochu. Při instalaci se použije přímo vložené logo, nikoli externí obrázek.</p>
<p><a href="./index.html">Otevřít aplikaci RaK</a></p>
</main>
<script>if(window.navigator.standalone||window.matchMedia('(display-mode: standalone)').matches)window.location.replace('./index.html?source=pwa');</script>
</body></html>`;
  fs.writeFileSync(path.join(root, 'ios-install.html'), html);
  console.log('[pwa-transparent-icons] PASS: transparent Windows/Android; iOS inline-icon installer created');
}
if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
  await generateTransparentAppIcons(process.argv[2] || process.cwd());
}
