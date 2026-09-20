#!/usr/bin/env node
// Preserve held game writes even if they predate the game's legacy progress reset.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path='supabase-bridge.js';
let source=fs.readFileSync(path,'utf8');
const before='  function isGameProgressQueueTaskBeforeReset(task) {\n    const type =';
const after='  function isGameProgressQueueTaskBeforeReset(task) {\n    // RAK_17059_HELD_RESET_GUARD: quarantine always survives compaction.\n    if (task && task.conflict) return false;\n    const type =';
if(!source.includes(after)){
 assert(source.includes(before),'[17059] game reset guard location changed');
 assert.equal(source.split(before).length,2,'[17059] ambiguous game reset guard');
 source=source.replace(before,after);
 fs.writeFileSync(path,source,'utf8');
}
console.log('[queue-held-reset-17059] held historic game changes retained');
