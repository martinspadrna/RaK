#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const POLICY = "const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';";

if (sw.includes(POLICY)) {
  console.log('[full-app-audit-fixes-1630] second build pass: audit fixes already applied; preserving first-pass result.');
} else {
  await import(pathToFileURL(path.join(root, 'tools/full-app-audit-fixes-1630.mjs')).href);
}
