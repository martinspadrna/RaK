#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');
const splashPath = path.join(root, 'rak-login-splash.js');

const DISPLAY_VERSION = '1.6.25';
const BUILD_ID = '1.6.25-login1024';
const TARGET_SIZE = 1024;
const POLICY_MARKER = "const DEVELOPMENT_LOGIN_ASSET_POLICY = 'login-png-1024;retina-safe;sharp-lanczos3';";
const ASSET_POLICY_MARKER = "const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';";
const TARGETS = Object.freeze([
  'assets/rak-login-crab.png',
  'assets/rak-login-crab-step.png',
  'assets/rak-login-crab-tap.png'
]);

function assert(condition, message) {
  if (!condition) throw new Error('[pwa-login-assets-1625] ' + message);
}

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
const splash = fs.readFileSync(splashPath, 'utf8');

// Safety contract: this resize is only valid for the current login layout.
assert(splash.includes('.rakSplashBrand{width:clamp(190px,30vh,276px)'), 'Login mascot max-width contract changed; refusing resize.');
assert(splash.includes('@media(max-height:700px){.rakSplashContent{gap:9px}.rakSplashBrand{width:clamp(160px,29vh,218px)'), 'Short-screen login mascot contract changed; refusing resize.');
for (const target of TARGETS) {
  assert(splash.includes(target), 'Login splash no longer references ' + target + '.');
}
assert(sw.includes(ASSET_POLICY_MARKER), 'RaK 1.6.24 lossless asset policy missing.');
assert(sw.includes("'./assets/rak-login-crab.png'"), 'CORE login crab must remain precached.');
assert(sw.includes("const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';"), 'RaK 1.6.22 startup policy missing.');

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;

if (!sw.includes(POLICY_MARKER)) {
  for (const rel of TARGETS) {
    const file = path.join(root, rel);
    assert(fs.existsSync(file), 'Missing target ' + rel + '.');

    const sourceBytes = fs.statSync(file).size;
    const sourceMeta = await sharp(file).metadata();
    assert(sourceMeta.width === 1254 && sourceMeta.height === 1254, `${rel} expected 1254x1254, got ${sourceMeta.width}x${sourceMeta.height}.`);

    const reference = await sharp(file)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    assert(reference.info.width === TARGET_SIZE && reference.info.height === TARGET_SIZE, rel + ' resize dimensions invalid.');
    assert(reference.info.channels >= 3 && reference.info.channels <= 4, rel + ' unexpected channel count.');

    const encoded = await sharp(reference.data, {
      raw: {
        width: reference.info.width,
        height: reference.info.height,
        channels: reference.info.channels
      }
    }).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();

    const decoded = await sharp(encoded).raw().toBuffer({ resolveWithObject: true });
    assert(decoded.info.width === TARGET_SIZE && decoded.info.height === TARGET_SIZE, rel + ' encoded dimensions invalid.');
    assert(decoded.info.channels === reference.info.channels, rel + ' encoded channel count changed.');
    assert(decoded.data.length === reference.data.length, rel + ' decoded pixel buffer size changed.');
    assert(Buffer.compare(decoded.data, reference.data) === 0, rel + ' PNG encoding changed resized raster pixels.');
    assert(encoded.length < sourceBytes, `${rel} resized output is not smaller (${sourceBytes} -> ${encoded.length}).`);

    fs.writeFileSync(file, encoded);
    totalBefore += sourceBytes;
    totalAfter += encoded.length;
    changed += 1;
    console.log(`[pwa-login-assets-1625] ${rel} 1254x1254 ${sourceBytes} B -> 1024x1024 ${encoded.length} B (-${sourceBytes - encoded.length} B)`);
  }

  sw = sw.replace(ASSET_POLICY_MARKER, ASSET_POLICY_MARKER + '\n' + POLICY_MARKER);
  const diagAnchor = '      checkedAt: Date.now()';
  assert(sw.includes(diagAnchor), 'SW diagnostics anchor missing.');
  sw = sw.replace(diagAnchor, [
    `      loginPngTargetSize: ${TARGET_SIZE},`,
    `      loginPngChangedCount: ${changed},`,
    `      loginPngBytesBefore: ${totalBefore},`,
    `      loginPngBytesAfter: ${totalAfter},`,
    `      loginPngBytesSaved: ${totalBefore - totalAfter},`,
    diagAnchor
  ].join('\n'));

  console.log(`[pwa-login-assets-1625] TOTAL 3 login PNG: ${totalBefore} B -> ${totalAfter} B; saved ${totalBefore - totalAfter} B`);
} else {
  for (const rel of TARGETS) {
    const meta = await sharp(path.join(root, rel)).metadata();
    assert(meta.width === TARGET_SIZE && meta.height === TARGET_SIZE, `${rel} second-pass dimensions are not ${TARGET_SIZE}x${TARGET_SIZE}.`);
  }
  console.log('[pwa-login-assets-1625] second build pass: login PNG assets already 1024x1024; preserving first-pass diagnostics');
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

assert(config.includes(`window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`), 'Release version marker missing.');
assert(config.includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`), 'Display version marker missing.');
assert(config.includes(`window.RAK_PWA_BUILD = "v${BUILD_ID}";`), 'PWA build marker missing.');
assert(sw.includes(`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`), 'SW display version marker missing.');
assert(sw.includes(`const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`), 'SW build marker missing.');
assert(sw.includes(POLICY_MARKER), 'Login asset policy marker missing.');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'Stable cache version contract changed unexpectedly.');
assert(sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'"), 'Stable navigation/cache strategy changed unexpectedly.');

fs.writeFileSync(configPath, config, 'utf8');
fs.writeFileSync(swPath, sw, 'utf8');

console.log('[pwa-login-assets-1625] OK RaK 1.6.25: login PNG 1254→1024 only; 1.6.24 lossless assets + 1.6.22 startup/security/navigation preserved');
