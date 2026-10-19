import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {GENERATED_ICON_NAMES} from './build-transparent-pwa-icons.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
test('Windows any icons keep alpha while original mobile icons stay maskable',async()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 const icons=manifest.icons;
 for(const size of [192,512]){
   const any=icons.find(x=>x.sizes===size+'x'+size&&x.purpose==='any');
   const maskable=icons.find(x=>x.sizes===size+'x'+size&&x.purpose==='maskable');
   assert(any?.src.includes('icon-any-'+size+'.png'),size+' transparent any icon');
   assert(maskable?.src.includes('icon-'+size+'.png'),size+' existing maskable icon');
 }
 const index=read('index.html'),worker=read('sw.js');
 assert(index.includes('icon-any-32.png'),'transparent favicon');
 assert(worker.includes('icon-any-512.png'),'new PWA icon precached');
 const source=await sharp(path.join(root,'assets/app-icons/icon-any-source-128.png')).metadata();
 assert(source.hasAlpha&&source.width===128&&source.height===128,'source transparent');
 for(const name of GENERATED_ICON_NAMES){
   const filename=path.join(root,'assets/app-icons',name);
   if(!fs.existsSync(filename))continue; // Local source checks may run before canonical build.
   const {width,height,hasAlpha}=await sharp(filename).metadata();
   const expected=Number(name.match(/\d+/)[0]);
   assert(width===expected&&height===expected&&hasAlpha,name+' PNG dimensions/alpha');
 }
});
