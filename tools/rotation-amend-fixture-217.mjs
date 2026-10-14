import fs from 'node:fs';
import vm from 'node:vm';
import {extractNamedDeclaration} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
export function rotationAmendFixtureSource(){
 let core=read('core.js');
 for(const name of ['appRotation','app'])core=core.replace(extractNamedDeclaration(core,name),'');
 return [core,...['brusy.js','admin-machine-settings.js','admin-rotation-overtime.js','admin-rotation-generator.js','admin-rotation-generator-wizard.js','admin-rotation-editor.js','admin-rotation.js'].map(read)].join('\n');
}
export function rotationAmendFixture(){
 const storage=new Map();
 const context=vm.createContext({console,Blob,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),navigator:{onLine:true},
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  initialRotationData:{months:{}},
  app:{rotation:{months:{}},selectedMonth:'10/26',machineSettingsRows:[],adminUnlocked:true}});
 context.window=context;
 vm.runInContext(rotationAmendFixtureSource(),context);
 return {context,storage,evaluate:source=>vm.runInContext(source,context)};
}
export const sampleMonthSource=`(()=>{
 const names=['Blažek','Kmínek','Kříž','Novotný','Pech','Starý','Střížek','Synek','Třasák','Špadrna'];
 const dates=Array.from({length:26},(_,i)=>(i+1)+'.10. R');
 const month={hard:{machines:HARD_MACHINE_HEADERS.slice(),title:'Rotace tvrdota',rows:dates.map((date,i)=>({date,cells:names.slice(i%10).concat(names.slice(0,i%10)).slice(0,5)}))},
 soft:{machines:SOFT_MACHINE_HEADERS.slice(),title:'Rotace měkota',rows:dates.map((date,i)=>({date,cells:names.slice(i%10).concat(names.slice(0,i%10)).slice(5)}))},notes:[{date:'2.10. R',person:'Pech',code:'D',shift:'R',text:'Pech D'}],pressRotationOverrides:{'2.10. R':'nosplit'}};
 return normalizeMonthForImport(month,month);
})()`;
