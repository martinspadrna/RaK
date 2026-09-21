// RaK – Report směny pro mistra.
(function () {
  'use strict';

  const STORAGE_KEY = 'rak:shiftReports';
  const DRAFT_STORAGE_PREFIX = 'rak:shiftReportDraft:v1';
  const DRAFT_RETENTION_VERSION = 1;
  const DRAFT_RETENTION_TEAM = 'D';
  const HARD = ['TNKS01', 'TPKW01', 'TPKW02', 'TBKR01', 'TBKR07'];
  const SOFT = ['MSKC01', 'MSKC02', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
  const INDEX_COLORS = { AF: 'blue', AG: 'green', AH: 'orange', AD: 'blue', AE: 'green' };
  const INDEX_ORDER = { AG: 0, AE: 0, AF: 1, AD: 1, AH: 2 };
  const REPORT_SEPARATOR = '__________';
  const RAK_SHIFT_REPORT_MO_POLICY = 'separate-normal-free-lines;restore-free-draft';
  const SECTIONS = [
    { id: 'mo', label: 'MO', fields: ['free'], indexes: ['AF', 'AG', 'AH'], defaultIndex: 'AF', totalNok: true },
    { id: 'to', label: 'TO', fields: [], indexes: ['AD', 'AE', 'AH'], defaultIndex: 'AD' },
    { id: 'r01', label: 'TBKR01', fields: ['nok', 'free'], indexes: ['AD', 'AE', 'AH'], defaultIndex: 'AD' },
    { id: 'r07', label: 'TRBR07', fields: ['nok', 'free'], indexes: ['AD', 'AE', 'AH'], defaultIndex: 'AD' }
  ];
  function esc(value) { if (typeof escapeHtml === 'function') return escapeHtml(String(value == null ? '' : value)); return String(value == null ? '' : value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c])); }
  function localDateValue(date) { const d = date || new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; }
  // RAK_EXTERNAL_SHIFT_TEAMS_17020
function defaultShiftContext(now) {
  const d = new Date(now || Date.now());
  const info=typeof getRakActiveAccountShiftInfo==='function'?getRakActiveAccountShiftInfo():{team:'D',outside:false};
  if(info.outside&&typeof getTeamShiftState==='function'){const state=getTeamShiftState(d,info.team);const own=state&&(state.active?state:state.next);if(own&&own.start instanceof Date){const start=own.start,h=start.getHours();return {date:localDateValue(start),shift:(h>=18||h<6)?'N':'R'};}}
  const hour=d.getHours(); let shift='R'; if (hour < 6) { shift='N'; d.setDate(d.getDate()-1); } else if (hour >= 18) shift='N'; return { date: localDateValue(d), shift }; }
  function inputNumber(value, cls, placeholder) { return '<input class="rakShiftInput '+cls+'" type="number" min="0" step="1" inputmode="numeric" value="'+esc(value||'')+'" placeholder="'+esc(placeholder||'0')+'">'; }
  function indexColorClass(index) { return 'rakShiftIndex--'+(INDEX_COLORS[index]||'neutral'); }
  function selectIndex(section,value) { const indexes=section.indexes||[]; const selected=indexes.includes(value)?value:(section.defaultIndex||indexes[0]||''); return '<select class="rakShiftSelect rakShiftIndex '+indexColorClass(selected)+'" data-index-color="'+esc(INDEX_COLORS[selected]||'neutral')+'">'+indexes.map((i)=>'<option value="'+i+'"'+(i===selected?' selected':'')+'>'+i+'</option>').join('')+'</select>'; }
  function sectionRow(section,data) { const d=data||{}; const fields=section.fields||[]; const rowKind=fields.includes('free')?'nokFree':(fields.includes('nok')?'nok':'basic'); return ['<div class="rakShiftProdRow rakShiftProdRow--'+rowKind+'" data-section="'+section.id+'" data-index-color="'+esc(INDEX_COLORS[d.index||section.defaultIndex]||'neutral')+'">','  '+selectIndex(section,d.index||section.defaultIndex),'  '+inputNumber(d.qty,'rakShiftQty','ks'),fields.includes('free')?'  '+inputNumber(d.free,'rakShiftFree','volné'):'',fields.includes('nok')?'  '+inputNumber(d.nok,'rakShiftNok','NOK'):'','  <button type="button" class="rakShiftRemove" title="Odstranit řádek">×</button>','</div>'].join(''); }
  function sectionHtml(section,draft) { const rows=Array.isArray(draft&&draft.production&&draft.production[section.id])&&draft.production[section.id].length?draft.production[section.id]:[{index:section.defaultIndex}]; const totalNok=section.totalNok?'<label class="rakShiftTotalLabel">NOK'+inputNumber(draft&&draft.moNok, 'rakShiftTotalNok', '0')+'</label>':''; return ['<section class="rakShiftSection" data-section-block="'+section.id+'">','<div class="rakShiftSectionHead"><h4>'+section.label+'</h4></div>','<div class="rakShiftRows">'+rows.map((row)=>sectionRow(section,row)).join('')+'</div>',totalNok,'<button type="button" class="appMenuAction rakShiftAddIndex rakShiftAddBelow" data-shift-add="'+section.id+'">＋ Přidat index</button>','</section>'].join(''); }
  function currentTimeValue(value) { const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/); const now=match?null:new Date(); const hour=match?Number(match[1]):now.getHours(); const minute=match?Number(match[2]):now.getMinutes(); return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'); }
  function timeInput(className,value) { return '<input class="rakShiftTime '+className+'" type="time" step="60" inputmode="numeric" value="'+esc(value||'')+'">'; }
  function problemRow(data) { const d=data||{}; const machines=HARD.concat(SOFT); return ['<div class="rakShiftProblemRow">','<select class="rakShiftSelect rakShiftMachine"><option value="">Stroj…</option>'+machines.map((m)=>'<option value="'+m+'"'+(m===d.machine?' selected':'')+'>'+m+'</option>').join('')+'</select>','<label class="rakShiftTimeField"><span>Od</span>'+timeInput('rakShiftFrom',d.from)+'</label>','<label class="rakShiftTimeField"><span>Do</span>'+timeInput('rakShiftTo',d.to)+'</label>','<input class="rakShiftProblemText" type="text" maxlength="500" value="'+esc(d.text||'')+'" placeholder="Popis problému">','<button type="button" class="rakShiftRemove rakShiftProblemRemove" title="Odstranit problém">×</button>','</div>'].join(''); }
  function ensureStyles() { if(document.getElementById('rakShiftReportStyles'))return; const style=document.createElement('style'); style.id='rakShiftReportStyles'; style.textContent=`
.rakShiftReport{display:grid;gap:14px}.rakShiftIntro{font-size:13px;opacity:.78}.rakShiftContext{display:grid;grid-template-columns:minmax(0,1fr) minmax(106px,.65fr);align-items:end;gap:10px;max-width:340px}.rakShiftContext label,.rakShiftTotalLabel{display:grid;gap:5px;min-width:0;font-size:13px}.rakShiftContext .rakShiftDate,.rakShiftContext .rakShiftShift{width:100%;min-width:0;max-width:100%}.rakShiftTotalLabel{max-width:180px;margin-top:10px}.rakShiftSection{border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:12px;background:rgba(255,255,255,.025)}
.rakShiftSectionHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.rakShiftSectionHead h4{margin:0;font-size:16px}.rakShiftRows{display:grid;gap:7px}.rakShiftAddBelow{width:100%;margin-top:10px}
.rakShiftProdRow{display:grid;grid-template-columns:minmax(70px,1fr) minmax(80px,1fr) minmax(80px,1fr) minmax(80px,1fr) 34px;gap:7px;align-items:center;border-radius:12px;padding:4px}.rakShiftProdRow--basic{grid-template-columns:minmax(70px,1fr) minmax(80px,1fr) 34px}.rakShiftProdRow--nok{grid-template-columns:minmax(70px,1fr) minmax(80px,1fr) minmax(80px,1fr) 34px}.rakShiftSelect,.rakShiftInput,.rakShiftTime,.rakShiftProblemText{box-sizing:border-box;width:100%;min-width:0;min-height:40px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(0,0,0,.22);color:inherit;padding:8px 10px}.rakShiftRemove{border:0;background:transparent;color:inherit;opacity:.6;font-size:22px;cursor:pointer}.rakShiftRemove:hover{opacity:1}
.rakShiftIndex{-webkit-appearance:none;appearance:none;font-weight:950;text-align:center;border-width:2px!important;padding-right:10px!important;letter-spacing:.02em}.rakShiftIndex--blue{color:#fff!important;border-color:#b3efff!important;background:linear-gradient(145deg,#067dff,#00aaff)!important;box-shadow:0 0 24px rgba(0,164,255,.76),inset 0 1px 0 rgba(255,255,255,.54)!important;text-shadow:0 1px 1px #003d8f,0 0 20px #bdeeff}.rakShiftIndex--green{color:#fff!important;border-color:#b5ffe0!important;background:linear-gradient(145deg,#00b966,#00ee87)!important;box-shadow:0 0 24px rgba(0,237,135,.70),inset 0 1px 0 rgba(255,255,255,.54)!important;text-shadow:0 1px 1px #00562f,0 0 20px #c7ffdd}.rakShiftIndex--orange{color:#fff!important;border-color:#fff0ad!important;background:linear-gradient(145deg,#ffe12b,#ffae00 52%,#f55c00)!important;box-shadow:0 0 24px rgba(255,163,0,.78),inset 0 1px 0 rgba(255,255,255,.54)!important;text-shadow:0 1px 1px #943000,0 0 20px #fff0a5}.rakShiftProdRow[data-index-color="blue"]{background:linear-gradient(90deg,rgba(0,164,255,.28),rgba(0,170,255,.08));box-shadow:inset 4px 0 0 #5cdaff,0 0 17px rgba(0,164,255,.21)}.rakShiftProdRow[data-index-color="green"]{background:linear-gradient(90deg,rgba(0,237,135,.24),rgba(0,185,102,.08));box-shadow:inset 4px 0 0 #63ffb1,0 0 17px rgba(0,231,131,.19)}.rakShiftProdRow[data-index-color="orange"]{background:linear-gradient(90deg,rgba(255,174,0,.28),rgba(245,92,0,.08));box-shadow:inset 4px 0 0 #ffdb62,0 0 17px rgba(255,169,0,.21)}
.rakShiftProblems{display:grid;gap:10px}.rakShiftProblemRow{display:grid;grid-template-columns:minmax(110px,1.15fr) minmax(100px,1fr) minmax(100px,1fr) minmax(150px,1.5fr) 38px;gap:8px;align-items:end}.rakShiftProblemRow label{display:grid;grid-template-rows:18px 40px;gap:4px;font-size:12px;opacity:.9}.rakShiftProblemRow label span{text-align:left;padding-left:4px}.rakShiftProblemText{min-height:40px}.rakShiftActions{display:flex;flex-wrap:wrap;gap:8px}.rakShiftPreview{white-space:pre-wrap;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px;background:rgba(0,0,0,.18);font-family:inherit;font-size:13px}.rakShiftStatus{font-size:13px;min-height:18px}
@media(max-width:640px){.rakShiftContext{grid-template-columns:minmax(0,1fr) minmax(100px,.62fr);gap:8px}.rakShiftProdRow{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 34px;gap:6px}.rakShiftProdRow--basic{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) 34px}.rakShiftProdRow--nok{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,1fr) 34px}.rakShiftProblemRow{grid-template-columns:minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr);gap:8px;align-items:end}.rakShiftMachine{grid-column:1}.rakShiftProblemText{grid-column:1 / -1}.rakShiftProblemRemove{grid-column:1 / -1;width:52px;height:44px;margin-top:2px}.rakShiftProblemRow label{min-width:0}.rakShiftTime{padding:6px 7px;font-size:16px}.rakShiftSectionHead{align-items:flex-start}}
@media(max-width:360px){.rakShiftContext{grid-template-columns:1fr}.rakShiftContext label,.rakShiftContext .rakShiftDate,.rakShiftContext .rakShiftShift{width:100%;max-width:100%}}
`; document.head.appendChild(style); }
  function syncIndexColor(select){if(!select)return;select.classList.remove('rakShiftIndex--blue','rakShiftIndex--green','rakShiftIndex--orange','rakShiftIndex--neutral');select.classList.add(indexColorClass(select.value));const color=INDEX_COLORS[select.value]||'neutral';select.dataset.indexColor=color;const row=select.closest('.rakShiftProdRow');if(row)row.dataset.indexColor=color;}
  function getDraft(root){const production={};SECTIONS.forEach((section)=>{production[section.id]=Array.from(root.querySelectorAll('[data-section="'+section.id+'"]')).map((row)=>({index:row.querySelector('.rakShiftIndex')?.value||section.defaultIndex,qty:row.querySelector('.rakShiftQty')?.value||'',nok:row.querySelector('.rakShiftNok')?.value||'',free:row.querySelector('.rakShiftFree')?.value||''})).filter((r)=>r.qty!==''||r.nok!==''||r.free!=='');});const problems=Array.from(root.querySelectorAll('.rakShiftProblemRow')).map((row)=>({machine:row.querySelector('.rakShiftMachine')?.value||'',from:row.querySelector('.rakShiftFrom')?.value||'',to:row.querySelector('.rakShiftTo')?.value||'',text:row.querySelector('.rakShiftProblemText')?.value.trim()||''})).filter((p)=>p.machine||p.from||p.to||p.text);return{date:root.querySelector('.rakShiftDate')?.value||'',shift:root.querySelector('.rakShiftShift')?.value||'',production,moNok:root.querySelector('.rakShiftTotalNok')?.value||'',problems};}
  function problemDuration(from,to){const parse=(value)=>{const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!match)return null;const hour=Number(match[1]);const minute=Number(match[2]);return hour>=0&&hour<24&&minute>=0&&minute<60?(hour*60+minute):null;};const start=parse(from);let end=parse(to);if(start==null||end==null)return null;if(end<start)end+=24*60;return end-start;} function formatProblemDuration(minutes){if(!Number.isFinite(minutes))return '';if(minutes<60)return String(minutes)+'min';const hours=Math.floor(minutes/60);const rest=minutes%60;return String(hours)+'h'+(rest?String(rest).padStart(2,'0')+'min':'');}
  function reportLineIndex(line) {
    const match = String(line || '').match(/\b(AF|AG|AH|AD|AE)\b/i);
    return match ? match[1].toUpperCase() : '';
  }
  function formatShiftReportText(text) {
    let lines = String(text || '').replace(/\r/g, '').split('\n');
    if (lines.length && /^\s*RaK\s*[–-]\s*REPORT SMĚNY\s*$/i.test(lines[0])) lines.shift();
    lines = lines
      .filter(line => !/^\s*_{5,}\s*$/.test(String(line || '')))
      .map(line => {
        let value = String(line || '');
        value = value.replace(/\s*·\s*R8?\s*$/i, ' · Ranní');
        value = value.replace(/\s*·\s*N8?\s*$/i, ' · Noční');
        const nok = value.match(/^\s*NoK\s+celkem:\s*(.+?)\s*$/i);
        if (nok) value = '  NOK: ' + nok[1];
        return value;
      });

    const out = [];
    let grinderSeen = false;
    const trimTrailingBlankLines = () => {
      while (out.length && !String(out[out.length - 1] || '').trim()) out.pop();
    };

    lines.forEach(line => {
      const header = String(line || '').trim();
      const grinderHeader = header === 'TBKR01:' || header === 'TRBR07:';
      if (grinderHeader) {
        if (!grinderSeen) {
          trimTrailingBlankLines();
          if (out.length && out[out.length - 1] !== REPORT_SEPARATOR) out.push(REPORT_SEPARATOR);
        } else if (header === 'TRBR07:') {
          trimTrailingBlankLines();
          out.push('');
        }
        grinderSeen = true;
        out.push(line);
        return;
      }
      if (header === 'PROBLÉMY:') {
        trimTrailingBlankLines();
        if (grinderSeen && out[out.length - 1] !== REPORT_SEPARATOR) out.push(REPORT_SEPARATOR);
        if (out.length) out.push('');
        out.push(line);
        return;
      }
      out.push(line);
    });

    const compact = [];
    out.forEach(line => {
      const blank = !String(line || '').trim();
      if (blank && (!compact.length || !String(compact[compact.length - 1] || '').trim())) return;
      compact.push(line);
    });
    while (compact.length && !String(compact[0] || '').trim()) compact.shift();
    while (compact.length && !String(compact[compact.length - 1] || '').trim()) compact.pop();
    return compact.join('\n');
  }
  function sortReportRowsByIndexColor(text) {
    const lines = String(text || '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const header = String(lines[i] || '').trim();
      if (!/^(MO|TO|TBKR01|TRBR07):$/.test(header)) {
        out.push(lines[i]);
        i += 1;
        continue;
      }
      out.push(lines[i]);
      i += 1;
      const rows = [];
      while (i < lines.length && /^\s*-\s*/.test(lines[i])) {
        rows.push({ line: lines[i], pos: rows.length, index: reportLineIndex(lines[i]) });
        i += 1;
      }
      rows.sort((a, b) => {
        const ao = Object.prototype.hasOwnProperty.call(INDEX_ORDER, a.index) ? INDEX_ORDER[a.index] : 99;
        const bo = Object.prototype.hasOwnProperty.call(INDEX_ORDER, b.index) ? INDEX_ORDER[b.index] : 99;
        return ao - bo || a.pos - b.pos;
      });
      rows.forEach(item => out.push(item.line));
    }
    return out.join('\n');
  }
  // RAK_SHIFT_TEXT_INDEX_TOTALS_17015
  function reportText(draft) {
    const date = draft.date ? new Date(draft.date + 'T12:00:00').toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ');
    const team=typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D';
    const lines = ['RaK – REPORT SMĚNY', date + ' · Směna ' + team + (draft.shift ? ' · ' + draft.shift : ''), ''];
    const labels = {mo:'MO',to:'TO',r01:'TBKR01',r07:'TBKR07'};
    const count = value => { const n=Number(String(value ?? '').trim().replace(',','.')); return Number.isFinite(n) && n>0 ? n : 0; };
    const fmt = value => new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(value);
    const suffix = value => count(value) ? ' (z toho ' + fmt(count(value)) + ' NOK)' : '';
    for (const id of Object.keys(labels)) {
      if (id === 'r01') lines.push('');
      lines.push(labels[id] + ':');
      const rows = Array.isArray(draft.production && draft.production[id]) ? draft.production[id] : [];
      const totals = new Map();
      const produced = [];
      // RAK_REPORT_SMART_TOTALS_17017
      const productionLineCount17017 = rows.reduce((sum, row) =>
        sum + (count(row.qty) > 0 ? 1 : 0) + (count(row.free) > 0 ? 1 : 0), 0);
      rows.forEach(row => {
        const index = row.index || '—', qty = count(row.qty), free = count(row.free), nok = count(row.nok);
        if (id === 'mo' || id === 'to') {
          if (qty) produced.push({index,text:id==='mo'?fmt(qty)+' '+index:index+' '+fmt(qty)+' ks'});
          if (free) produced.push({index,text:fmt(free)+' '+index+' volné'});
          if (nok) produced.push({index,text:index+' NOK '+fmt(nok)});
        } else {
          if (qty) produced.push({index,text:fmt(qty)+' '+index+' ks'+suffix(row.nok)});
          if (free) produced.push({index,text:fmt(free)+' '+index+' volné'+(qty?'':suffix(row.nok))});
          if (nok && !qty && !free) produced.push({index,text:index+' NOK '+fmt(nok)});
        }
        if (qty+free) totals.set(index,(totals.get(index)||0)+qty+free);
      });
      // Keep all lines of the same index together, matching the grouped PNG columns.
      if (id === 'mo' || id === 'to') {
        const names = Array.from(new Set(produced.map(item=>item.index)));
        names.forEach(index=>produced.filter(item=>item.index===index).forEach(item=>lines.push('  '+item.text)));
      } else produced.forEach(item=>lines.push('  '+item.text));
      if (!produced.length) lines.push('  Bez záznamu');
      if (totals.size && productionLineCount17017 > 1) {
        const total = Array.from(totals.values()).reduce((sum,n)=>sum+n,0);
        const indexed = Array.from(totals,([index,n])=>fmt(n)+' '+index).join(', ');
        const summary = id==='mo' ? 'Celkově '+indexed+' ('+fmt(total)+' ks)'
          : id==='to' ? 'Celkově '+fmt(total)+' ks'
          : 'Celkově '+fmt(total)+' ks ('+indexed+')';
        lines.push('  '+summary);
      }
      if (id==='mo' && count(draft.moNok)) lines.push('  NOK: '+fmt(count(draft.moNok)));
      lines.push('');
    }
    if (draft.problems && draft.problems.length) {
      const order=['TNKS01','TPKW01','TPKW02','TBKR01','TBKR07','MSKC01','MSKC02','MSKC03','MSKC04','MFKF06','MFKF10'];
      lines.push('PROBLÉMY:');
      draft.problems.slice().sort((a,b)=>{
        const ai=order.indexOf(a.machine),bi=order.indexOf(b.machine);
        return (ai<0?order.length:ai)-(bi<0?order.length:bi);
      }).forEach(p=>{
        const duration=formatProblemDuration(problemDuration(p.from,p.to));
        lines.push('  '+(p.machine||'Stroj')+' – '+(p.from||'??:??')+'–'+(p.to||'??:??')+(duration?' ('+duration+')':'')+', '+(p.text||'bez popisu'));
      });
    }
    return sortReportRowsByIndexColor(formatShiftReportText(lines.join('\n').trim()));
  }
  function saveLocal(text,draft){try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');rows.unshift({id:Date.now(),createdAt:new Date().toISOString(),text,draft});localStorage.setItem(STORAGE_KEY,JSON.stringify(rows.slice(0,30)));}catch(err){}}
  function draftStorageKey(){let account='';try{const profile=typeof rakUserProfileGet==='function'?rakUserProfileGet():null;account=String(profile&&profile.accountNumber||'').trim();if(!account&&typeof app==='object'&&app&&app.gamesProfile)account=String(app.gamesProfile.activeAccountId||'').trim();}catch(err){}return DRAFT_STORAGE_PREFIX+':'+(account||'local');}
  function safeDraftDate(value){const date=value instanceof Date?new Date(value.getTime()):new Date(value||Date.now());return Number.isNaN(date.getTime())?new Date():date;}
  function nextShiftReportTeamStartAfter(anchor){const base=safeDraftDate(anchor);try{if(typeof window.getDashboardNextTeamShift==='function'){const next=window.getDashboardNextTeamShift(base,DRAFT_RETENTION_TEAM);if(next&&next.start instanceof Date&&!Number.isNaN(next.start.getTime())&&next.start>base)return new Date(next.start.getTime());}}catch(err){}try{if(typeof window.getTeamShiftState!=='function')return null;const candidates=[];const collect=(probe)=>{const state=window.getTeamShiftState(probe,DRAFT_RETENTION_TEAM);if(!state)return;if(state.active&&state.start instanceof Date&&state.start>base)candidates.push(state.start);if(state.next&&state.next.start instanceof Date&&state.next.start>base)candidates.push(state.next.start);};collect(base);if(!candidates.length){for(let hours=6;hours<=60*24;hours+=6){collect(new Date(base.getTime()+hours*60*60*1000));if(candidates.length)break;}}candidates.sort((a,b)=>a-b);return candidates.length?new Date(candidates[0].getTime()):null;}catch(err){return null;}}
  function draftRetentionDeadline(saved){if(!saved)return null;if(saved.retainUntil){const explicit=safeDraftDate(saved.retainUntil);if(!Number.isNaN(explicit.getTime()))return explicit;}const anchor=saved.updatedAt?safeDraftDate(saved.updatedAt):new Date();return nextShiftReportTeamStartAfter(anchor);}
  function loadDraft(){try{const key=draftStorageKey();const saved=JSON.parse(localStorage.getItem(key)||'null');if(!(saved&&saved.draft&&typeof saved.draft==='object'))return null;const deadline=draftRetentionDeadline(saved);if(deadline&&Date.now()>=deadline.getTime()){localStorage.removeItem(key);return null;}if(deadline&&!saved.retainUntil){saved.retainUntil=deadline.toISOString();saved.retentionVersion=DRAFT_RETENTION_VERSION;saved.retentionTeam=DRAFT_RETENTION_TEAM;localStorage.setItem(key,JSON.stringify(saved));}return saved;}catch(err){return null;}}
  function saveDraft(root){try{if(!root)return;const updatedAt=new Date();const saved={updatedAt:updatedAt.toISOString(),draft:getDraft(root)};const deadline=nextShiftReportTeamStartAfter(updatedAt);if(deadline){saved.retainUntil=deadline.toISOString();saved.retentionVersion=DRAFT_RETENTION_VERSION;saved.retentionTeam=DRAFT_RETENTION_TEAM;}localStorage.setItem(draftStorageKey(),JSON.stringify(saved));}catch(err){}}
  function clearDraft(){try{localStorage.removeItem(draftStorageKey());}catch(err){}}
  function expireShiftReportDraftIfDue(){return loadDraft()===null;}
  async function shareReport(text,root){saveLocal(text,getDraft(root));try{if(navigator.share){await navigator.share({title:'RaK – report směny',text});setStatus(root,'Report připravený k odeslání.');return;}await navigator.clipboard.writeText(text);setStatus(root,'Report zkopírovaný do schránky – můžeš ho poslat mistrovi.');}catch(err){setStatus(root,'Odeslání bylo zrušeno nebo se nepovedlo.');}}
  function setStatus(root,text){const el=root.querySelector('.rakShiftStatus');if(el)el.textContent=text;} function renderPreview(root){const el=root.querySelector('.rakShiftPreview');if(el)el.textContent=reportText(getDraft(root));} function bindDraftInputs(root){if(!root||root.dataset.rakShiftDraftBound==='1')return;root.dataset.rakShiftDraftBound='1';root.addEventListener('input',()=>{renderPreview(root);saveDraft(root);});root.addEventListener('change',(event)=>{if(event.target?.classList?.contains('rakShiftIndex'))syncIndexColor(event.target);renderPreview(root);saveDraft(root);});}
  function addIndex(root,id){const block=root.querySelector('[data-section-block="'+id+'"] .rakShiftRows');const section=SECTIONS.find((s)=>s.id===id);if(!block||!section)return;block.insertAdjacentHTML('beforeend',sectionRow(section,{index:section.defaultIndex}));const added=block.lastElementChild?.querySelector('.rakShiftIndex');if(added)syncIndexColor(added);renderPreview(root);saveDraft(root);} function addProblem(root){const block=root.querySelector('.rakShiftProblems');if(!block)return;block.insertAdjacentHTML('beforeend',problemRow());renderPreview(root);saveDraft(root);} function canUseShiftReport(){return typeof rakAdminCanOpenShiftReport==='function'&&rakAdminCanOpenShiftReport();}
  function build(){if(!canUseShiftReport())return;ensureStyles();const body=document.getElementById('appMenuBody');if(!body||body.dataset.rakShiftReportOpen!=='1')return;const root=body.querySelector('#rakShiftReport');if(root)return;const saved=loadDraft();const draft=saved&&saved.draft?saved.draft:{};const defaults=defaultShiftContext();const ctx={date:/^\d{4}-\d{2}-\d{2}$/.test(String(draft.date||''))?draft.date:defaults.date,shift:['N','R','N8','R8'].includes(draft.shift)?draft.shift:defaults.shift};const problems=Array.isArray(draft.problems)&&draft.problems.length?draft.problems:[{}];body.innerHTML=['<div id="rakShiftReport" class="rakShiftReport">','<div>' + '  <div class="appMenuSubTitle">Report směny pro mistra · směna ' + (typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D') + '</div><div class="rakShiftIntro">MO: AF / AG / AH. TO a brusy: AD / AE / AH. Barvy indexů odpovídají výrobním indexům.</div></div>','<div class="rakShiftContext"><label>Datum směny<input class="rakShiftInput rakShiftDate" type="date" value="'+ctx.date+'"></label>','<label>Směna<select class="rakShiftSelect rakShiftShift"><option value="N"'+(ctx.shift==='N'?' selected':'')+'>Noc</option><option value="R"'+(ctx.shift==='R'?' selected':'')+'>Ráno</option><option value="N8"'+(ctx.shift==='N8'?' selected':'')+'>Noc 8 h</option><option value="R8"'+(ctx.shift==='R8'?' selected':'')+'>Ráno 8 h</option></select></label></div>',SECTIONS.map((section)=>sectionHtml(section,draft)).join(''),'<section class="rakShiftSection"><div class="rakShiftSectionHead"><h4>Problémy / odstávky</h4></div><div class="rakShiftProblems">'+problems.map(problemRow).join('')+'</div><button type="button" class="appMenuAction rakShiftAddProblem rakShiftAddBelow">＋ Přidat problém</button></section>','<section class="rakShiftSection"><div class="appMenuSubTitle">Náhled reportu</div><div class="rakShiftPreview"></div></section>','<div class="rakShiftActions"><button type="button" class="appMenuAction" data-shift-action="preview">Obnovit náhled</button><button type="button" class="appMenuAction isActive" data-shift-action="send">Odeslat report</button><button type="button" class="appMenuAction" data-shift-action="clear">Vymazat rozepsaný report</button><button type="button" class="appMenuAction" data-shift-action="close">Zpět</button></div>','<div class="rakShiftStatus"></div>','</div>'].join('');const builtRoot=body.querySelector('#rakShiftReport');builtRoot?.querySelectorAll('.rakShiftIndex').forEach(syncIndexColor);bindDraftInputs(builtRoot);renderPreview(builtRoot);if(saved)setStatus(builtRoot,'Obnovený rozepsaný report se průběžně ukládá do tohoto zařízení.');}
  function bindBody(){const host=document;if(host.documentElement.dataset.rakShiftDelegated==='1')return;host.documentElement.dataset.rakShiftDelegated='1';host.addEventListener('focusin',(e)=>{const input=e.target;if(input?.classList?.contains('rakShiftTime')&&!input.value){input.value=currentTimeValue();saveDraft(input.closest('#rakShiftReport'));}});host.addEventListener('input',(e)=>{const root=e.target.closest('#rakShiftReport');if(root){renderPreview(root);saveDraft(root);}});host.addEventListener('change',(e)=>{const input=e.target;const root=input&&input.closest('#rakShiftReport');if(input?.classList?.contains('rakShiftIndex'))syncIndexColor(input);if(root){renderPreview(root);saveDraft(root);}});host.addEventListener('click',(e)=>{const root=e.target.closest('#rakShiftReport');if(!root)return;if(!canUseShiftReport()){e.preventDefault();return;}const add=e.target.closest('[data-shift-add]');if(add){addIndex(root,add.dataset.shiftAdd);return;}if(e.target.closest('.rakShiftAddProblem')){addProblem(root);return;}if(e.target.closest('.rakShiftRemove')){e.target.closest('.rakShiftProdRow,.rakShiftProblemRow')?.remove();renderPreview(root);saveDraft(root);return;}const action=e.target.closest('[data-shift-action]')?.dataset.shiftAction;const body=document.getElementById('appMenuBody');if(action==='preview'){renderPreview(root);saveDraft(root);return;}if(action==='send'){saveDraft(root);void shareReport(reportText(getDraft(root)),root);return;}if(action==='clear'){clearDraft();if(body){body.dataset.rakShiftReportOpen='0';if(typeof rakAdminIsDeputy==='function'&&rakAdminIsDeputy()){if(typeof openAppMenu==='function')openAppMenu('menu');}else if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');}return;}if(action==='close'){saveDraft(root);if(body){body.dataset.rakShiftReportOpen='0';if(typeof rakAdminIsDeputy==='function'&&rakAdminIsDeputy()){if(typeof openAppMenu==='function')openAppMenu('menu');}else if(typeof renderAdminMenuBody==='function')renderAdminMenuBody(body,'home');}return;}});}
  function bootShiftReport(){bindBody();expireShiftReportDraftIfDue();window.addEventListener('focus',expireShiftReportDraftIfDue);document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')expireShiftReportDraftIfDue();});}
  window.rakExpireShiftReportDraftIfDue=expireShiftReportDraftIfDue;
  window.rakGetShiftReportRetentionDeadline=()=>{const saved=loadDraft();const deadline=draftRetentionDeadline(saved);return deadline?new Date(deadline.getTime()):null;};
  window.RakShiftReport={open:()=>{if(!canUseShiftReport())return;expireShiftReportDraftIfDue();const body=document.getElementById('appMenuBody');if(body){body.dataset.rakShiftReportOpen='1';build();}}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootShiftReport,{once:true});else bootShiftReport();
})();
