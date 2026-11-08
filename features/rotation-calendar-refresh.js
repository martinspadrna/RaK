// RaK 2.0.49 – refresh editor absences through the generator's ICS loader.
// Only adds unsaved local rows; never writes to Supabase or overrides manual edits.
(function(root){
  let running=false;
  const identity=(date,person,code)=>[
    adminRotationDateBaseKey(date),
    adminRotationNameLookupKey(person),
    adminRotationNameLookupKey(adminRotationSmartAbsenceCode(code))
  ].join('|');
  root.rakRefreshRotationCalendarAbsences=async function(monthKey,button){
    const editor=document.getElementById('adminRotationEditor');
    const body=document.getElementById('appMenuBody');
    const table=editor && editor.querySelector('.appMenuAdminAbsenceTable tbody');
    const status=editor && editor.querySelector('#adminRotationCalendarStatus');
    if(running||!table||!status||!app.adminUnlocked)return {ok:false,reason:'unavailable'};
    running=true;
    if(button)button.disabled=true;
    status.textContent='Načítám absence z kalendáře přiřazené směny…';
    try{
      const month=app.rotation && app.rotation.months && app.rotation.months[monthKey];
      const days=adminRotationGetMonthWorkDates(monthKey);
      if(!month||!days.length)throw new Error('V měsíci nejsou žádné pracovní dny.');
      const {team,texts,partial}=await adminRotationGeneratorFetchCalendarIcs();
      const picker=body && body.querySelector('#adminMonthSelect');
      if(!editor.isConnected||!body||body.dataset.adminView!=='rotation'||
        (picker?picker.value:getAdminSelectedMonthKey())!==monthKey)
        return {ok:false,reason:'month-changed'};
      const imported=[];
      for(const text of texts){
        for(const day of adminRotationGeneratorParseIcsAbsences(text,monthKey,days)){
          for(const row of day.rows||[]){
            if(row.person&&row.code)imported.push({date:day.date,person:row.person,code:row.code});
          }
        }
      }
      // Re-read live DOM after fetch; never discard changes typed during the request.
      const manual=Array.from(table.querySelectorAll('tr[data-note-row-index]'));
      const existing=new Set();
      for(const tr of manual){
        const read=f=>String(tr.querySelector('[data-note-field="'+f+'"]')?.value||'').trim();
        const person=read('person'),code=read('code');
        if(person&&code)existing.add(identity(read('date'),person,code));
      }
      const additions=[];
      for(const row of imported){
        const id=identity(row.date,row.person,row.code);
        if(existing.has(id))continue;
        existing.add(id);
        additions.push(row);
      }
      if(additions.length){
        const last=manual[manual.length-1];
        const next=Math.max(-1,...manual.map(tr=>Number(tr.getAttribute('data-note-row-index'))).filter(Number.isFinite))+1;
        const html=additions.map((row,i)=>adminNotesRowTemplate(row,next+i,true)).join('');
        if(last)last.insertAdjacentHTML('afterend',html);
        else table.insertAdjacentHTML('beforeend',html);
        app.adminRotationDirty=true;
        const draft=rakPreserveAdminMonthDraft(monthKey,readAdminRotationFromDom(monthKey));
        const summary=editor.querySelector('#adminRotationAbsenceSummary');
        if(summary)summary.innerHTML=buildAdminAbsenceSummaryHtml(readAdminRotationFromDom(monthKey));
        if(typeof adminRenderRotationPreSaveChecklist==='function')adminRenderRotationPreSaveChecklist(body);
        status.textContent='Směna '+team+': doplněno '+additions.length+' nových absencí z '+imported.length+' nalezených. Ruční řádky zachovány. Ulož tlačítkem Uložit rozpis.'+
          (partial?' Část kalendářů se nepodařilo načíst.':'')+
          (draft.stored?'':' Pozor: místní zálohu se nepodařilo potvrdit; neobnovuj stránku.');
        const draftStatus=editor.querySelector('#adminRotationDraftStatus');
        if(draftStatus)draftStatus.textContent='Absence jsou rozepsané lokálně; pro online uložení stiskni Uložit rozpis.';
      }else{
        status.textContent='Směna '+team+': žádné nové absence. Nalezeno '+imported.length+' záznamů; existující a ručně upravené zůstaly beze změny.'+
          (partial?' Část kalendářů se nepodařilo načíst.':'');
      }
      return {ok:true,added:additions.length,found:imported.length,team};
    }catch(err){
      if(status && status.isConnected)status.textContent='Načtení absencí se nezdařilo. Zkontroluj Administrace → Kalendáře a připojení. Rozepsané změny zůstaly zachované.';
      return {ok:false,reason:String(err&&err.message||err)};
    }finally{
      running=false;
      if(button&&button.isConnected)button.disabled=false;
    }
  };
})(window);
