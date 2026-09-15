#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISPLAY_VERSION = '1.6.30';
const BUILD_ID = '1.6.30-audit1';
const POLICY = "const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';";
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, source) => fs.writeFileSync(path.join(root, file), source, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error('[full-app-audit-finalize-1630] ' + message); };

let sw = read('sw.js');
let config = read('supabase-config.js');
const exportJs = read('export.js');
const mobileAudit = read('rak-mobile-smoke-audit.js');
const domAudit = read('rak-dom-action-audit.js');
const releaseGates = read('rak-release-gates.js');

assert(sw.includes(POLICY), '1.6.30 audit policy missing before finalization');
assert(!exportJs.includes('"games-engine.js"'), 'stale Games export path returned');
assert(!exportJs.includes('"app-usage-smoke-v963.js"'), 'stale missing smoke path returned');
assert(!mobileAudit.includes("route: 'games'"), 'stale Games route returned to diagnostics');
assert(!domAudit.includes("'home', 'rotace', 'kalkulacky', 'games', 'menu'"), 'stale Games nav requirement returned');
assert(!releaseGates.includes("'games-profile-dom-hardening'"), 'stale Games release gate returned');

sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'stable cache contract changed');
write('sw.js', sw);
write('supabase-config.js', config);
console.log('[full-app-audit-finalize-1630] OK final deployed markers locked to RaK 1.6.30 after every build pass');
