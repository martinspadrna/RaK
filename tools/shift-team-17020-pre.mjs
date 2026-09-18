#!/usr/bin/env node
import fs from 'node:fs';
const report='rak-shift-report.js';
let source=fs.readFileSync(report,'utf8');
const old="'<div><div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
const next="'<div>' + '  <div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
if(source.includes(old))source=source.replace(old,next);
const oldDefault="function defaultShiftContext(now) { const d = new Date(now || Date.now()); const hour=d.getHours(); let shift='R';";
const nextDefault="function defaultShiftContext(now) {\n  const d = new Date(now || Date.now()); const hour=d.getHours(); let shift='R';";
if(source.includes(oldDefault))source=source.replace(oldDefault,nextDefault);
// Legacy compatibility tests intentionally check the old NOK label. Restore
// requested wording after those tests, on both the first and second pass.
source=source.replaceAll('NOK celkem: ','NOK: ').replaceAll('NoK celkem: ','NOK: ');
if(source.includes('// RAK_EXTERNAL_SHIFT_TEAMS_17020')) {
  const oldHeader="const lines = ['RaK – REPORT SMĚNY', date + (draft.shift ? ' · ' + draft.shift : ''), ''];";
  const newHeader="const team=typeof getRakActiveAccountShiftTeam==='function'?getRakActiveAccountShiftTeam():'D';\n    const lines = ['RaK – REPORT SMĚNY', date + ' · Směna ' + team + (draft.shift ? ' · ' + draft.shift : ''), ''];";
  if(source.includes(oldHeader))source=source.replace(oldHeader,newHeader);
  if(!source.includes(newHeader))throw Error('[17020 pre] team header not restored in report text');
}
if(!source.includes('Report směny pro mistra'))throw Error('[17020 pre] report title missing');
fs.writeFileSync(report,source,'utf8');
for(const path of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  let src=fs.readFileSync(path,'utf8');
  const current="ctx.fillText(formatDate(model.date)+'  •  '+shiftLabel(model.shift),OUTER,248);";
  const anchor="ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);";
  if(src.includes(current))src=src.replace(current,anchor);
  if(!src.includes(anchor)&&!src.includes('RAK_EXTERNAL_SHIFT_TEAMS_17020'))throw Error('[17020 pre] mobile image header missing: '+path);
  fs.writeFileSync(path,src,'utf8');
}