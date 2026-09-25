import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity, RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function textFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    if (['.git','node_modules','.rak-canonical-build','.rak-dist','work'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) textFiles(full, output);
    else if (/\.(?:md|mjs|js|json|yml|yaml)$/.test(entry.name) || entry.name === 'package.json') output.push(full);
  }
  return output;
}

test('1.7.106 has one live handoff and no parallel RAK_PLAN_13 source', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.106');
  assert.match(metadata.displayVersion, /^1\.7\.10[6-9]$/);
  assert.equal(fs.existsSync(path.join(root, 'RAK_PLAN_13.md')), false);
  const backup = read('rak-complete-backup.js');
  assert(backup.includes('"RAK_HANDOFF.md"'));
  assert(!backup.includes('RAK_PLAN_13.md'));
  assert(read('tools/roadmap-contract.test.mjs').includes("read('RAK_HANDOFF.md')"));
  assert(!read('tools/vercel-build-policy.mjs').includes('RAK_PLAN_13.md'));
});

test('1.7.106 release wiring and backup manifest are current', () => {
  const metadata = assertCurrentReleaseIdentity(read, '1.7.106');
  assert.equal(JSON.parse(read('package.json')).version, metadata.displayVersion);
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=' + metadata.displayVersion));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v" + metadata.displayVersion + "'"));
  const workflow = read('.github/workflows/rak-development-validation.yml');
  assert(workflow.includes('tools/release-gate-17106.test.mjs'));
  assert(workflow.includes('rak-170106-isolated-build-'+'
});

test('active source and documentation no longer link to the retired plan', () => {
  const allowed = new Set(['RAK_HANDOFF.md','CHANGELOG.md','tools/release-gate-17106.test.mjs']);
  const offenders = [];
  for (const file of textFiles(root)) {
    const relative = path.relative(root, file).replaceAll('\\','/');
    if (allowed.has(relative)) continue;
    if (fs.readFileSync(file, 'utf8').includes('RAK_PLAN_13.md')) offenders.push(relative);
  }
  assert.deepEqual(offenders, [], 'retired plan still referenced by active files: '+offenders.join(', '));
});
+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.106 (development)'));
});

test('active source and documentation no longer link to the retired plan', () => {
  const allowed = new Set(['RAK_HANDOFF.md','CHANGELOG.md','tools/release-gate-17106.test.mjs']);
  const offenders = [];
  for (const file of textFiles(root)) {
    const relative = path.relative(root, file).replaceAll('\\','/');
    if (allowed.has(relative)) continue;
    if (fs.readFileSync(file, 'utf8').includes('RAK_PLAN_13.md')) offenders.push(relative);
  }
  assert.deepEqual(offenders, [], 'retired plan still referenced by active files: '+offenders.join(', '));
});
