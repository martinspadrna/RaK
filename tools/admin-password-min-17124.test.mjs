import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const readiness=read('module-readiness.js');
const unlock=read('app-admin-unlock.js');
const menu=read('app-menu.js');
const edge=read('supabase/functions/rak-admin-users/index.ts');

test('admin password UI minimum is six characters everywhere',()=>{
  assert(readiness.includes('const MIN_PASSWORD_LENGTH = 6;'));
  assert(readiness.includes('Heslo nového správce musí mít alespoň 6 znaků.'));
  assert(readiness.includes("target.placeholder = 'heslo min. 6 znaků';"));
  assert(!readiness.includes('12 znaků'));

  assert.equal((unlock.match(/newPassword\.length < 6/g)||[]).length,2);
  assert.equal((unlock.match(/newPassword\.length < 12/g)||[]).length,0);
  assert(unlock.includes('data-admin-account-password type="password" minlength="6" maxlength="128"'));
  assert.equal((unlock.match(/minlength="6" maxlength="128" data-admin-owner-password=/g)||[]).length,2);
  assert.equal((unlock.match(/minlength="6" maxlength="128" data-admin-own-password=/g)||[]).length,2);

  assert(menu.includes('Nové heslo musí mít alespoň 6 znaků a současné nesmí být prázdné.'));
  assert(!menu.includes('Nové heslo musí mít alespoň 12 znaků'));
});

test('server accepts six-character passwords and still rejects shorter or overlong values',()=>{
  assert.equal((edge.match(/newPassword\.length < 6/g)||[]).length,2);
  assert.equal((edge.match(/password\.length < 6/g)||[]).length,1);
  assert.equal((edge.match(/newPassword\.length < 12/g)||[]).length,0);
  assert.equal((edge.match(/password\.length < 12/g)||[]).length,0);
  assert.equal((edge.match(/newPassword\.length > 128/g)||[]).length,2);
  assert(edge.includes('password.length > 128'));
  assert(edge.includes('currentPassword.length > 128'));
});

test('lower minimum does not weaken role or current-password verification',()=>{
  assert(edge.includes('(actor.role !== "owner" && actor.role !== "admin")'));
  assert(edge.includes('if (actor.role !== "owner") return jsonResponse'));
  assert.equal((edge.match(/currentPassword === newPassword/g)||[]).length,2);
  assert.equal((edge.match(/signInWithPassword/g)||[]).length,2);
  assert(edge.includes('ctx.supabaseAdmin.auth.admin.createUser'));
  assert(edge.includes('ctx.supabaseAdmin.auth.admin.updateUserById'));
});
