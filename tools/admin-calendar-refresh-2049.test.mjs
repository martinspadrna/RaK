import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const feature=read('features/rotation-calendar-refresh.js');
const editor=read('admin-rotation-editor.js');
const router=read('app-menu.js');
const wizard=read('admin-rotation-generator-wizard.js');

test('admin Absence button uses the same isolated Google ICS loader and never auto-saves',()=>{
  assert(editor.includes('data-admin-action="refresh-calendar-absences"'));
  assert(editor.includes('id="adminRotationCalendarStatus"'));
  assert(router.includes("adminAction === 'refresh-calendar-absences'"));
  assert(router.includes("features/rotation-calendar-refresh.js?v="));
  assert(wizard.includes('async function adminRotationGeneratorFetchCalendarIcs()'));
  assert(wizard.includes('const {team,texts,partial}=await adminRotationGeneratorFetchCalendarIcs()'));
  assert(feature.includes('await adminRotationGeneratorFetchCalendarIcs()'));
  assert(feature.includes('adminRotationGeneratorParseIcsAbsences(text,monthKey,days)'));
  assert(wizard.includes("cache:'no-store',credentials:'same-origin'"));
  assert(!/saveRotationToSupabase|syncRotationToSupabase|localStorage\.removeItem/.test(feature));
  const sw=read('sw.js');
  assert(sw.includes("'./features/rotation-calendar-refresh.js?v=2.0.49'"),'offline app must retain lazy importer');
});

function fixture({error=false,stale=false,partial=false}={}){
  const monthKey='11/26',rows=[], inserted=[];
  function row(date,person,code,index){
    return {
      getAttribute:name=>name==='data-note-row-index'?String(index):null,
      querySelector:selector=>{
        const match=selector.match(/data-note-field="([^"]+)"/);
        return match?{value:{date,person,code}[match[1]]}:null;
      },
      insertAdjacentHTML(_position,html){
        for(const entry of html.split('|').filter(Boolean)){
          const data=JSON.parse(entry);
          rows.push(row(data.row.date,data.row.person,data.row.code,data.index));
          inserted.push(data);
        }
      }
    };
  }
  rows.push(row('2.11. R','Novotný','D',0),row('','','',1));
  const table={
    querySelectorAll:selector=>selector==='tr[data-note-row-index]'?rows.slice():[],
    insertAdjacentHTML:(_p,html)=>rows[rows.length-1].insertAdjacentHTML('afterend',html)
  };
  const status={textContent:'',isConnected:true};
  const draftStatus={textContent:''};
  const summary={innerHTML:''};
  const button={disabled:false,isConnected:true};
  const picker={value:stale?'10/26':monthKey};
  const editorEl={
    isConnected:true,
    querySelector:selector=>({
      '.appMenuAdminAbsenceTable tbody':table,
      '#adminRotationCalendarStatus':status,
      '#adminRotationAbsenceSummary':summary,
      '#adminRotationDraftStatus':draftStatus
    })[selector]||null
  };
  const body={dataset:{adminView:'rotation'},querySelector:selector=>selector==='#adminMonthSelect'?picker:null};
  const app={adminUnlocked:true,adminRotationDirty:false,rotation:{months:{[monthKey]:{notes:[]}}}};
  let backups=0;
  const sandbox={
    window:{},document:{getElementById:id=>id==='adminRotationEditor'?editorEl:id==='appMenuBody'?body:null},
    app,
    adminRotationGetMonthWorkDates:()=>['2.11. R','3.11. R'],
    adminRotationGeneratorFetchCalendarIcs:async()=>{
      if(error)throw Error('offline');
      return {team:'D',texts:['google'],partial};
    },
    adminRotationGeneratorParseIcsAbsences:()=>[
      {date:'2.11. R',rows:[{person:'Novotný',code:'D'},{person:'Starý',code:'N'}]},
      {date:'3.11. R',rows:[{person:'Starý',code:'D'}]}
    ],
    adminRotationDateBaseKey:date=>String(date||'').split(' ')[0],
    adminRotationNameLookupKey:value=>String(value||'').toLowerCase(),
    adminRotationSmartAbsenceCode:value=>value,
    getAdminSelectedMonthKey:()=>monthKey,
    adminNotesRowTemplate:(newRow,index)=>JSON.stringify({row:newRow,index})+'|',
    readAdminRotationFromDom:()=>({notes:rows.map(r=>({date:r.querySelector('[data-note-field="date"]').value,person:r.querySelector('[data-note-field="person"]').value,code:r.querySelector('[data-note-field="code"]').value}))}),
    rakPreserveAdminMonthDraft:()=>{backups++;return {stored:true}},
    buildAdminAbsenceSummaryHtml:month=>String(month.notes.length),
    adminRenderRotationPreSaveChecklist:()=>{},
    console
  };
  vm.runInNewContext(feature,sandbox);
  return {run:()=>sandbox.window.rakRefreshRotationCalendarAbsences(monthKey,button),rows,inserted,status,summary,draftStatus,button,app,backups:()=>backups};
}

test('calendar refresh appends only missing absences, keeps live edits, and remains pending',async()=>{
  const f=fixture();
  const first=await f.run();
  assert.equal(first.ok,true);assert.equal(first.added,2);
  assert.equal(f.rows.length,4);assert.equal(f.inserted.length,2);
  assert.equal(f.inserted[0].row.person,'Starý');
  assert.equal(f.inserted[1].row.date,'3.11. R');
  assert.equal(f.rows[0].querySelector('[data-note-field="person"]').value,'Novotný');
  assert.equal(f.app.adminRotationDirty,true);
  assert.equal(f.backups(),1);
  assert.equal(f.button.disabled,false);
  assert.match(f.status.textContent,/Uložit rozpis/);
  assert.equal(f.summary.innerHTML,'4');
  const again=await f.run();
  assert.equal(again.added,0,'repeated refresh must be idempotent');
  assert.equal(f.rows.length,4);
});

test('unavailable calendar or changed month never clears the current editor',async()=>{
  const offline=fixture({error:true});
  const result=await offline.run();
  assert.equal(result.ok,false);
  assert.equal(offline.rows.length,2);
  assert.equal(offline.app.adminRotationDirty,false);
  assert.equal(offline.button.disabled,false);
  assert.match(offline.status.textContent,/nezdařilo/);
  const otherMonth=fixture({stale:true});
  const skip=await otherMonth.run();
  assert.equal(skip.ok,false);assert.equal(skip.reason,'month-changed');
  assert.equal(otherMonth.rows.length,2);
  assert.equal(otherMonth.app.adminRotationDirty,false);
});
