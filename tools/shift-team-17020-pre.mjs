#!/usr/bin/env node
import fs from 'node:fs';
const report='rak-shift-report.js';
let source=fs.readFileSync(report,'utf8');
const old="'<div><div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
const next="'<div>' + '  <div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
if(source.includes(old)){source=source.replace(old,next);fs.writeFileSync(report,source,'utf8');}
if(!source.includes('Report směny pro mistra'))throw Error('[17020 pre] report title missing');
for(const path of ['rak-shift-report-image.js','rak-shift-report-share.js']){
  let src=fs.readFileSync(path,'utf8');
  const current="ctx.fillText(formatDate(model.date)+'  •  '+shiftLabel(model.shift),OUTER,248);";
  const anchor="ctx.fillText(formatDate(model.date) + '  •  ' + shiftLabel(model.shift), OUTER, 218);";
  if(src.includes(current))src=src.replace(current,anchor);
  if(!src.includes(anchor)&&!src.includes('RAK_EXTERNAL_SHIFT_TEAMS_17020'))throw Error('[17020 pre] mobile image header missing: '+path);
  fs.writeFileSync(path,src,'utf8');
}