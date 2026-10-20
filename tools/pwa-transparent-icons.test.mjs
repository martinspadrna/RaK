import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {GENERATED_ICON_NAMES} from './build-transparent-pwa-icons.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
test('Windows and Android keep transparent icons while iOS receives a compatible legacy-logo fallback',async()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 const icons=manifest.icons;
 for(const size of [192,512]){
   const any=icons.find(x=>x.sizes===size+'x'+size&&x.purpose==='any');
   assert(any?.src.includes('icon-any-'+size+'.png'),size+' transparent any icon');
   assert(!icons.some(x=>x.sizes===size+'x'+size&&x.purpose==='maskable'),size+' no legacy opaque Android icon');
 }
 const index=read('index.html'),worker=read('sw.js');
 assert(index.includes('icon-any-32.png'),'transparent favicon');
 assert(index.includes('apple-touch-icon') && index.includes('apple-touch-icon.png?v=2.0.27-ios1'),'iOS points to compatible cache-busted icon');
 const iosManifestIcon=icons.find(x=>x.sizes==='180x180'&&x.purpose==='any');
 assert(iosManifestIcon?.src==='apple-touch-icon.png?v=2.0.27-ios1','Edge manifest has an explicit iOS fallback');
 const iosPath=path.join(root,'apple-touch-icon.png');
 if(fs.existsSync(iosPath)){
   const ios=await sharp(iosPath).metadata();
   assert.equal(ios.width,180,'Apple icon width');
   assert.equal(ios.height,180,'Apple icon height');
   assert.equal(ios.hasAlpha,false,'Apple icon must be opaque for iOS');
   const installerPath=path.join(root,'ios-install.html');
   if(fs.existsSync(installerPath)){
     const installer=fs.readFileSync(installerPath,'utf8');
     const inline=installer.match(/<link rel="apple-touch-icon" sizes="180x180" href="data:image\\/png;base64,([^"]+)">/);
     assert(inline,'iOS 27 installer must embed the full PNG directly in the Apple link');
     const embedded=Buffer.from(inline[1],'base64');
     assert(embedded.equals(fs.readFileSync(iosPath)),'installer embedded icon matches PNG bytes exactly');
     assert(installer.includes('window.location.replace'), 'standalone install launcher returns to actual RaK app');
     const parsed=await sharp(embedded).metadata();
     assert.equal(parsed.width,180);
     assert.equal(parsed.height,180);
     assert.equal(parsed.hasAlpha,false);
   }
 }
 assert(worker.includes('icon-any-180.png'),'iOS icon precached for offline use');
 assert(worker.includes('icon-any-512.png'),'new PWA icon precached');
 const source=await sharp(path.join(root,'assets/app-icons/icon-any-source-128.png')).metadata();
 assert(source.hasAlpha&&source.width===128&&source.height===128,'source transparent');
 const {data,info}=await sharp(path.join(root,'assets/app-icons/icon-any-source-128.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(data[3],0,'top left corner of source must be fully transparent');
 assert(data.some((value,i)=>i%info.channels===3&&value>=240),'icon contains a clearly visible logo');
 for(const name of GENERATED_ICON_NAMES){
   const filename=path.join(root,'assets/app-icons',name);
   if(!fs.existsSync(filename))continue; // Local source checks may run before canonical build.
   const {width,height,hasAlpha}=await sharp(filename).metadata();
   const expected=Number(name.match(/\d+/)[0]);
   assert(width===expected&&height===expected&&hasAlpha,name+' PNG dimensions/alpha');
 }
});
