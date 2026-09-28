#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const MODE=String(process.argv[2]||'');
const ROOT=path.resolve(process.argv[3]||'.rak-p15-private');
const PRIVATE=path.join(ROOT,'private');
const SNAPSHOT_PATH=path.join(PRIVATE,'snapshot.json');
const STATUS_PATH=path.join(ROOT,'status.env');
const EVIDENCE_PATH=path.join(ROOT,'restore-proof.json');
const BRIDGE_URL='https://cgshssdjgzzuprlwnabl.supabase.co/functions/v1/rak-p15-restore-export';
const OIDC_AUDIENCE='rak-p15-restore-drill';
const MAX_ROWS=1000;
const SKIP_PUBLIC_DATA=new Set(['rak_admin_devices']);

function assert(ok,msg){if(!ok)throw new Error('[P1.5 restore drill] '+msg);}
function safeName(v){return String(v||'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'migration';}
function safeStoragePath(v){const parts=String(v||'').split('/');assert(parts.length&&parts.every(p=>p&&p!=='.'&&p!=='..'),'invalid storage path');return parts;}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function parseEnv(file){const out={};for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);out[m[1]]=v;}return out;}
function canon(v){if(Array.isArray(v))return v.map(canon);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=canon(v[k]);return o;}return v;}
function rowKey(v){return JSON.stringify(canon(v));}
function digestRows(rows){return crypto.createHash('sha256').update(JSON.stringify([...rows].map(canon).sort((a,b)=>rowKey(a).localeCompare(rowKey(b))))).digest('hex');}
function remapValue(v,map){if(typeof v==='string'&&map.has(v))return map.get(v);if(Array.isArray(v))return v.map(x=>remapValue(x,map));if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=remapValue(x,map);return o;}return v;}
function sqlLit(v){return "'"+String(v).replaceAll("'","''")+"'";}
function qident(v){return '"'+String(v).replaceAll('"','""')+'"';}
function psql(dbUrl,sql){return execFileSync('psql',[dbUrl,'-X','-v','ON_ERROR_STOP=1','-q','-t','-A','-c',sql],{encoding:'utf8',maxBuffer:128*1024*1024});}
function psqlJson(dbUrl,sql){const s=psql(dbUrl,sql).trim();return s?JSON.parse(s):null;}

async function oidcToken(){
  const rawUrl=String(process.env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
  const reqToken=String(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||'');
  assert(rawUrl&&reqToken,'GitHub OIDC environment is missing');
  const u=new URL(rawUrl);u.searchParams.set('audience',OIDC_AUDIENCE);
  const res=await fetch(u,{headers:{authorization:'Bearer '+reqToken}});
  assert(res.ok,'GitHub OIDC token request failed');
  const body=await res.json();
  assert(body&&typeof body.value==='string'&&body.value.split('.').length===3,'invalid GitHub OIDC token');
  return body.value;
}
async function bridgeJson(token,action,payload={}){
  const res=await fetch(BRIDGE_URL,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({action,...payload})});
  const body=await res.text();
  assert(res.ok,'TEST backup bridge '+action+' failed (HTTP '+res.status+')');
  try{return JSON.parse(body);}catch{throw new Error('[P1.5 restore drill] invalid JSON from TEST backup bridge');}
}
async function bridgeBytes(token,bucket,name){
  const res=await fetch(BRIDGE_URL,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({action:'storage-object',bucket,name})});
  assert(res.ok,'TEST Storage export failed (HTTP '+res.status+')');
  return Buffer.from(await res.arrayBuffer());
}

async function exportSource(){
  assert(process.env.GITHUB_REPOSITORY==='martinspadrna/RaK','wrong GitHub repository');
  assert(process.env.GITHUB_REF==='refs/heads/development','restore drill is development-only');
  fs.mkdirSync(PRIVATE,{recursive:true,mode:0o700});
  const token=await oidcToken();
  const manifest=await bridgeJson(token,'manifest');
  assert(manifest?.format==='rak-complete-backup-manifest-v2','unexpected backup manifest format');
  const names=Array.isArray(manifest.public_tables)?manifest.public_tables.map(String):[];
  assert(names.length>0&&new Set(names).size===names.length,'invalid table inventory');
  const pub={};
  for(const table of names){
    assert(/^[a-z_][a-z0-9_]*$/i.test(table)&&table!=='rak_admin_secrets','unsafe table in manifest');
    const part=await bridgeJson(token,'table',{table});
    assert(part?.format==='rak-complete-backup-table-v2'&&part.table===table&&Array.isArray(part.rows),'invalid table payload for '+table);
    pub[table]=part.rows;
  }
  const md=manifest.data&&typeof manifest.data==='object'?manifest.data:{};
  const snapshot={format:'rak-complete-backup-v1',generated_at:manifest.generated_at,database:manifest.database,data:{public:pub,private:md.private,auth:md.auth,storage:md.storage,redacted:md.redacted},schema:manifest.schema,sensitive_exclusions:manifest.sensitive_exclusions};
  writeJson(SNAPSHOT_PATH,snapshot);

  const migrations=await bridgeJson(token,'migrations');
  assert(migrations?.format==='rak-complete-backup-migrations-v1'&&Array.isArray(migrations.migrations)&&migrations.migrations.length>0,'migration history missing');
  const migDir=path.join(ROOT,'supabase','migrations');
  fs.mkdirSync(migDir,{recursive:true,mode:0o700});
  let last='';
  for(const m of migrations.migrations){
    const version=String(m?.version||'');const name=String(m?.name||'');const statements=m?.statements;
    assert(/^\d{14}$/.test(version)&&version>last,'migration order is invalid at '+version);
    assert(Array.isArray(statements)&&statements.length>0&&statements.every(x=>typeof x==='string'&&x.trim()),'migration SQL missing for '+version);
    fs.writeFileSync(path.join(migDir,version+'_'+safeName(name)+'.sql'),statements.join('\n\n')+'\n',{mode:0o600});
    last=version;
  }
  writeJson(path.join(PRIVATE,'migration-index.json'),migrations.migrations.map(m=>({version:String(m.version),name:String(m.name)})));

  const storage=snapshot.data?.storage||{};
  const objects=Array.isArray(storage.objects)?storage.objects:[];
  for(const obj of objects){
    const bucket=String(obj?.bucket_id||'');const name=String(obj?.name||'');
    assert(bucket&&name,'Storage metadata misses bucket/name');
    const bytes=await bridgeBytes(token,bucket,name);
    const file=path.join(PRIVATE,'storage-files',...safeStoragePath(bucket),...safeStoragePath(name));
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,bytes,{mode:0o600});
  }
  console.log('[P1.5] private TEST export complete: tables='+names.length+', migrations='+migrations.migrations.length+', storage_objects='+objects.length);
}

async function fetchAll(client,table){
  const out=[];for(let from=0;;from+=MAX_ROWS){const {data,error}=await client.from(table).select('*').range(from,from+MAX_ROWS-1);if(error)throw error;out.push(...(data||[]));if(!data||data.length<MAX_ROWS)break;}return out;
}

async function restoreTarget(){
  const snapshot=readJson(SNAPSHOT_PATH);const env=parseEnv(STATUS_PATH);
  const api=env.API_URL||env.SUPABASE_URL;const service=env.SERVICE_ROLE_KEY;const anon=env.ANON_KEY;const db=env.DB_URL;
  assert(api&&service&&anon&&db,'local Supabase status is incomplete');
  const admin=createClient(api,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const users=Array.isArray(snapshot.data?.auth?.users_sanitized)?snapshot.data.auth.users_sanitized:[];
  const identities=Array.isArray(snapshot.data?.auth?.identities_sanitized)?snapshot.data.auth.identities_sanitized:[];
  const idMap=new Map();const creds=new Map();
  for(const u of users){
    const oldId=String(u?.id||'');assert(oldId,'sanitized Auth user without id');
    const password=crypto.randomBytes(24).toString('base64url')+'aA1!';
    const attrs={password,email_confirm:true};
    if(u?.email)attrs.email=String(u.email);else if(u?.phone){delete attrs.email_confirm;attrs.phone=String(u.phone);attrs.phone_confirm=true;}else attrs.email='restore-'+oldId+'@invalid.local';
    const {data,error}=await admin.auth.admin.createUser(attrs);assert(!error&&data?.user?.id,'local Auth recreation failed');
    idMap.set(oldId,String(data.user.id));creds.set(String(data.user.id),{email:attrs.email||'',phone:attrs.phone||'',password});
  }

  const publicData=snapshot.data?.public||{};
  const publicTables=Object.keys(publicData).sort();
  const tableList=publicTables.concat(['rak_admin_secrets']).filter((v,i,a)=>a.indexOf(v)===i);
  if(tableList.length){
    psql(db,'set session_replication_role=replica; truncate table '+tableList.map(t=>'public.'+qident(t)).join(', ')+' restart identity cascade; set session_replication_role=origin;');
  }

  const expected={};
  let sql='set session_replication_role=replica;\n';
  for(const table of publicTables){
    const rows=SKIP_PUBLIC_DATA.has(table)?[]:(Array.isArray(publicData[table])?publicData[table].map(r=>remapValue(r,idMap)):[]);
    expected[table]=rows;
    if(!rows.length)continue;
    const columns=Object.keys(rows[0]);assert(columns.length,'row without columns in '+table);
    const identity=Array.isArray(snapshot.schema?.columns)&&snapshot.schema.columns.some(c=>c?.schema==='public'&&c?.table===table&&c?.identity==='YES');
    sql+='insert into public.'+qident(table)+' ('+columns.map(qident).join(',')+') '+(identity?'overriding system value ':'')+'select '+columns.map(qident).join(',')+' from jsonb_populate_recordset(null::public.'+qident(table)+','+sqlLit(JSON.stringify(rows))+'::jsonb);\n';
  }
  const privateRows=Array.isArray(snapshot.data?.private?.rak_rotation_import_metadata_v1)?snapshot.data.private.rak_rotation_import_metadata_v1.map(r=>remapValue(r,idMap)):[];
  if(privateRows.length){
    psql(db,'set session_replication_role=replica; truncate table private.rak_rotation_import_metadata_v1; set session_replication_role=origin;');
    const columns=Object.keys(privateRows[0]);
    sql+='insert into private.rak_rotation_import_metadata_v1 ('+columns.map(qident).join(',')+') select '+columns.map(qident).join(',')+' from jsonb_populate_recordset(null::private.rak_rotation_import_metadata_v1,'+sqlLit(JSON.stringify(privateRows))+'::jsonb);\n';
  }
  sql+='set session_replication_role=origin;\n';
  psql(db,sql);
  psql(db,`do $$ declare r record; begin for r in select n.nspname as s,c.relname as t,a.attname as c,pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname) as seq from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where n.nspname in ('public','private') loop if r.seq is not null then execute format('select setval(%L,coalesce((select max(%I) from %I.%I),1),true)',r.seq,r.c,r.s,r.t); end if; end loop; end $$;`);

  const storage=snapshot.data?.storage||{};const buckets=Array.isArray(storage.buckets)?storage.buckets:[];const objects=Array.isArray(storage.objects)?storage.objects:[];
  for(const b of buckets){const id=String(b?.id||b?.name||'');assert(id,'Storage bucket without id');const {error}=await admin.storage.createBucket(id,{public:Boolean(b?.public),fileSizeLimit:b?.file_size_limit??undefined,allowedMimeTypes:Array.isArray(b?.allowed_mime_types)?b.allowed_mime_types:undefined});assert(!error||/already exists/i.test(String(error.message||'')),'local Storage bucket restore failed');}
  for(const o of objects){const bucket=String(o?.bucket_id||'');const name=String(o?.name||'');const file=path.join(PRIVATE,'storage-files',...safeStoragePath(bucket),...safeStoragePath(name));const bytes=fs.readFileSync(file);const {error}=await admin.storage.from(bucket).upload(name,bytes,{upsert:true,contentType:String(o?.metadata?.mimetype||'application/octet-stream')});assert(!error,'local Storage object restore failed');}

  const tableProof={};
  for(const table of publicTables){const actual=await fetchAll(admin,table);const ehash=digestRows(expected[table]);const ahash=digestRows(actual);assert(expected[table].length===actual.length,'row count mismatch for '+table);assert(ehash===ahash,'row hash mismatch for '+table);tableProof[table]={rows_match:true,hash_match:true};}
  const actualPrivate=psqlJson(db,"select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from private.rak_rotation_import_metadata_v1 t")||[];
  assert(digestRows(privateRows)===digestRows(actualPrivate),'private rotation import hash mismatch');

  const sourceMigrations=readJson(path.join(PRIVATE,'migration-index.json'));
  const localMigrations=psqlJson(db,"select coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations")||[];
  assert(JSON.stringify(sourceMigrations)===JSON.stringify(localMigrations),'migration order/history mismatch');

  const expectedRls=(Array.isArray(snapshot.schema?.tables)?snapshot.schema.tables:[]).filter(t=>t&&['public','private'].includes(t.schema)).map(t=>({schema:String(t.schema),name:String(t.name),rls:Boolean(t.rls_enabled),force_rls:Boolean(t.rls_forced)})).sort((a,b)=>(a.schema+'.'+a.name).localeCompare(b.schema+'.'+b.name));
  const actualRls=psqlJson(db,"select coalesce(jsonb_agg(jsonb_build_object('schema',x.schema,'name',x.name,'rls',x.rls,'force_rls',x.force_rls) order by x.schema,x.name),'[]'::jsonb) from (select n.nspname schema,c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r') x")||[];
  assert(JSON.stringify(expectedRls)===JSON.stringify(actualRls),'RLS table flags mismatch');
  const expectedPolicies=(Array.isArray(snapshot.schema?.policies)?snapshot.schema.policies.filter(p=>p&&['public','private'].includes(String(p.schema||''))).length:0);
  const localPolicies=Number(psql(db,"select count(*) from pg_policies where schemaname in ('public','private')").trim()||0);
  assert(expectedPolicies===localPolicies,'RLS policy count mismatch');

  const profiles=expected.rak_admin_profiles||[];const roleProof=[];
  for(const p of profiles.filter(x=>['owner','admin','deputy'].includes(String(x?.role||''))&&x?.enabled!==false)){
    const newId=String(p.user_id||'');const c=creds.get(newId);assert(c,'restored admin profile has no recreated Auth account');
    const client=createClient(api,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=c.email?{email:c.email,password:c.password}:{phone:c.phone,password:c.password};
    const {error:loginError}=await client.auth.signInWithPassword(login);assert(!loginError,'restored '+p.role+' cannot sign in with replacement credential');
    const {data:ctx,error:ctxError}=await client.rpc('rak_admin_context');assert(!ctxError&&String(ctx?.role||'')===String(p.role),'restored '+p.role+' role gate failed');
    roleProof.push(String(p.role));await client.auth.signOut();
  }
  const localIdentityRows=psqlJson(db,"select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'provider',provider)),'[]'::jsonb) from auth.identities")||[];
  const sourceProviders=new Map();
  for(const identity of identities){const old=String(identity?.user_id||'');const provider=String(identity?.provider||'');if(!old||!provider)continue;const mapped=idMap.get(old);assert(mapped,'sanitized identity references missing Auth user');if(!sourceProviders.has(mapped))sourceProviders.set(mapped,new Set());sourceProviders.get(mapped).add(provider);}
  const localProviders=new Map();
  for(const identity of localIdentityRows){const user=String(identity?.user_id||'');const provider=String(identity?.provider||'');if(!localProviders.has(user))localProviders.set(user,new Set());localProviders.get(user).add(provider);}
  for(const [user,providers] of sourceProviders){const actual=localProviders.get(user)||new Set();for(const provider of providers)assert(actual.has(provider),'restored Auth identity provider missing');}
  assert(localIdentityRows.length>=sourceProviders.size,'restored Auth identity count is incomplete');
  assert(roleProof.includes('owner'),'owner role was not functionally restored');
  const anonClient=createClient(api,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const anonRead=await anonClient.from('rak_admin_profiles').select('account_id').limit(1);
  assert(anonRead.error||!(anonRead.data&&anonRead.data.length),'anonymous admin profile read is not blocked');

  const {data:localBuckets,error:bucketError}=await admin.storage.listBuckets();assert(!bucketError,'local Storage list failed');
  const bucketIds=new Set((localBuckets||[]).map(b=>String(b.id)));
  for(const b of buckets)assert(bucketIds.has(String(b.id||b.name||'')),'restored Storage bucket missing');
  for(const o of objects){const bucket=String(o.bucket_id||'');const name=String(o.name||'');const {data,error}=await admin.storage.from(bucket).download(name);assert(!error&&data,'restored Storage object missing');const actual=Buffer.from(await data.arrayBuffer());const source=fs.readFileSync(path.join(PRIVATE,'storage-files',...safeStoragePath(bucket),...safeStoragePath(name)));assert(crypto.createHash('sha256').update(actual).digest('hex')===crypto.createHash('sha256').update(source).digest('hex'),'Storage byte hash mismatch');}

  const proof={format:'rak-p15-restore-proof-v1',source:'TEST Supabase via GitHub OIDC',target:'ephemeral local Supabase on GitHub-hosted runner',production_touched:false,cost_model:'public-repo standard GitHub runner + local Supabase Docker',tables:{count:publicTables.length,all_counts_match:true,all_hashes_match:true,admin_devices_intentionally_reset:true},auth:{sanitized_users:users.length,sanitized_identities:identities.length,recreated_users:idMap.size,identity_providers_verified:true,credentials_restored:false,replacement_credentials_verified:true,roles_verified:[...new Set(roleProof)].sort()},storage:{bucket_count:buckets.length,object_count:objects.length,bytes_verified:true},schema:{migration_count:sourceMigrations.length,migration_order_match:true,rls_table_flags_match:true,rls_policy_count_match:true},private_data:{rotation_import_metadata_match:true,other_private_runtime_state_intentionally_reset:true},result:'PASS'};
  writeJson(EVIDENCE_PATH,proof);
  console.log('[P1.5] RESTORE_DRILL_PASS tables='+publicTables.length+' auth_users='+users.length+' storage_objects='+objects.length+' migrations='+sourceMigrations.length+' rls_policies='+expectedPolicies);
}

try{
  if(MODE==='export')await exportSource();
  else if(MODE==='restore')await restoreTarget();
  else throw new Error('usage: p15-restore-drill.mjs <export|restore> <private-root>');
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exit(1);}
