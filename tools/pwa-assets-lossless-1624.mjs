#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'sw.js');
const configPath = path.join(root, 'supabase-config.js');

const DISPLAY_VERSION = '1.6.24';
const BUILD_ID = '1.6.24-assets1';
const POLICY_MARKER = "const DEVELOPMENT_ASSET_OPTIMIZATION_POLICY = 'lossless-png-sharp-0.34.4;pixel-identity-guard';";
const TARGETS = Object.freeze([
  'assets/rak-login-crab.png',
  'assets/rak-login-crab-step.png',
  'assets/rak-login-crab-tap.png',
  'assets/help/frezky-fhb-help.png',
  'assets/help/frezky-konicita-help.png',
  'assets/help/soustruhy-vrtaky-x-help.png',
  'assets/app-icons/icon-1024.png',
  'assets/app-icons/icon-512.png',
  'assets/app-icons/icon-192.png',
  'assets/app-icons/icon-180.png',
  'assets/app-icons/icon-32.png',
  'assets/app-icons/icon-16.png',
  'assets/dashboard-icons/calendar.png',
  'assets/dashboard-icons/dovolena.png',
  'assets/dashboard-icons/eportal.png',
  'assets/dashboard-icons/hourglass.png',
  'assets/dashboard-icons/jidelna.png',
  'assets/dashboard-icons/jidelnilistek.png',
  'assets/dashboard-icons/kantyna.png',
  'assets/dashboard-icons/vyplata.png',
  'assets/nav-icons/home-gray.png',
  'assets/nav-icons/home-green.png',
  'assets/nav-icons/rotace-gray.png',
  'assets/nav-icons/rotace-green.png',
  'assets/nav-icons/kalkulacky-gray.png',
  'assets/nav-icons/kalkulacky-green.png'
]);

function fmt(bytes) {
  return `${bytes} B`;
}

async function pixelSignature(buffer) {
  const image = sharp(buffer, { failOn: 'error' });
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  return { metadata, data, info };
}

async function optimizeOne(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[pwa-assets-lossless-1624] Chybí PNG: ${relativePath}`);
  }
  const input = fs.readFileSync(absolutePath);
  const before = await pixelSignature(input);
  const output = await sharp(input, { failOn: 'error' })
    .keepIccProfile()
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false, effort: 10 })
    .toBuffer();
  const after = await pixelSignature(output);

  const sameGeometry = before.info.width === after.info.width
    && before.info.height === after.info.height
    && before.info.channels === after.info.channels;
  const samePixels = sameGeometry && before.data.equals(after.data);
  if (!samePixels) {
    throw new Error(`[pwa-assets-lossless-1624] Pixel guard selhal: ${relativePath}`);
  }

  const saved = Math.max(0, input.length - output.length);
  const shouldWrite = output.length < input.length;
  if (shouldWrite) fs.writeFileSync(absolutePath, output);

  const width = Number(before.metadata.width || before.info.width || 0);
  const height = Number(before.metadata.height || before.info.height || 0);
  console.log(`[pwa-assets-lossless-1624] ${relativePath} ${width}x${height}: ${fmt(input.length)} -> ${fmt(shouldWrite ? output.length : input.length)}${shouldWrite ? ` (-${saved} B)` : ' (beze změny)'}`);
  return { relativePath, inputBytes: input.length, outputBytes: shouldWrite ? output.length : input.length, savedBytes: saved, changed: shouldWrite };
}

let sw = fs.readFileSync(swPath, 'utf8');
let config = fs.readFileSync(configPath, 'utf8');
const alreadyOptimized = sw.includes(POLICY_MARKER);
let results = [];

if (!alreadyOptimized) {
  for (const target of TARGETS) results.push(await optimizeOne(target));
  const changed = results.filter((item) => item.changed);
  const savedBytes = results.reduce((sum, item) => sum + item.savedBytes, 0);
  const originalBytes = results.reduce((sum, item) => sum + item.inputBytes, 0);
  const finalBytes = results.reduce((sum, item) => sum + item.outputBytes, 0);

  if (!changed.length) throw new Error('[pwa-assets-lossless-1624] Žádný PNG se nezmenšil; optimalizační krok by neměl efekt.');

  const diagnosticMarker = "const DEVELOPMENT_STARTUP_DIAGNOSTIC_POLICY = 'idle-foundation-2;feature-css-10';";
  if (!sw.includes(diagnosticMarker)) throw new Error('[pwa-assets-lossless-1624] Chybí 1.6.22 startup diagnostic marker.');
  sw = sw.replace(diagnosticMarker, `${diagnosticMarker}\n${POLICY_MARKER}`);

  const adminHotfixLine = '    const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS.concat(DEVELOPMENT_ADMIN_HOTFIX_ASSETS);';
  if (!sw.includes(adminHotfixLine)) throw new Error('[pwa-assets-lossless-1624] Chybí hotfix cache anchor.');
  const assetList = TARGETS.map((item) => `  './${item}'`).join(',\n');
  const assetConst = `const DEVELOPMENT_ASSET_HOTFIX_ASSETS = [\n${assetList}\n];\n\n`;
  const adminConstAnchor = 'const DEVELOPMENT_ADMIN_HOTFIX_ASSETS = [';
  const adminStart = sw.indexOf(adminConstAnchor);
  if (adminStart < 0) throw new Error('[pwa-assets-lossless-1624] Chybí DEVELOPMENT_ADMIN_HOTFIX_ASSETS.');
  const adminEnd = sw.indexOf('];', adminStart);
  if (adminEnd < 0) throw new Error('[pwa-assets-lossless-1624] Nelze najít konec DEVELOPMENT_ADMIN_HOTFIX_ASSETS.');
  sw = sw.slice(0, adminEnd + 3) + '\n' + assetConst + sw.slice(adminEnd + 3);
  sw = sw.replace(adminHotfixLine, '    const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS.concat(DEVELOPMENT_ADMIN_HOTFIX_ASSETS, DEVELOPMENT_ASSET_HOTFIX_ASSETS);');

  const statusAnchor = '      deferredStartupDiagnosticCount: 2,';
  if (!sw.includes(statusAnchor)) throw new Error('[pwa-assets-lossless-1624] Chybí cache status anchor.');
  sw = sw.replace(statusAnchor, [
    statusAnchor,
    `      optimizedPngTargetCount: ${TARGETS.length},`,
    `      optimizedPngChangedCount: ${changed.length},`,
    `      optimizedPngBytesBefore: ${originalBytes},`,
    `      optimizedPngBytesAfter: ${finalBytes},`,
    `      optimizedPngBytesSaved: ${savedBytes},`
  ].join('\n'));

  console.log(`[pwa-assets-lossless-1624] TOTAL ${TARGETS.length} PNG: ${originalBytes} B -> ${finalBytes} B; saved ${savedBytes} B; changed ${changed.length}`);
} else {
  console.log('[pwa-assets-lossless-1624] second build pass: PNG assets already optimized; preserving first-pass diagnostics');
}

config = config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

if (!sw.includes(POLICY_MARKER)) throw new Error('[pwa-assets-lossless-1624] Asset policy marker chybí.');
if (!sw.includes('DEVELOPMENT_ASSET_HOTFIX_ASSETS')) throw new Error('[pwa-assets-lossless-1624] Asset cache purge list chybí.');
for (const target of TARGETS) {
  if (!sw.includes(`'./${target}'`)) throw new Error(`[pwa-assets-lossless-1624] Asset není v hotfix cache purge: ${target}`);
}
if (!/^window\.RAK_RELEASE_VERSION = "1\.6\.24";$/m.test(config)
  || !/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.24";$/m.test(config)
  || !/^window\.RAK_PWA_BUILD = "v1\.6\.24-assets1";$/m.test(config)
  || !/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.24';$/m.test(sw)
  || !/^const DEVELOPMENT_BUILD_ID = '1\.6\.24-assets1';$/m.test(sw)) {
  throw new Error('[pwa-assets-lossless-1624] Verze/build marker není 1.6.24-assets1.');
}

fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(configPath, config, 'utf8');
console.log('[pwa-assets-lossless-1624] OK RaK 1.6.24: lossless PNG recompress + pixel identity guard; cache refresh; 1.6.22 startup/security/navigation preserved');
