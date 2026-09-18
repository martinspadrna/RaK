#!/usr/bin/env node
import fs from 'node:fs';
const path='rak-shift-report.js';
let source=fs.readFileSync(path,'utf8');
const old="'<div><div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
const next="'<div>' + '  <div class=\"appMenuSubTitle\">Report směny pro mistra</div>";
if(source.includes(old)){
  source=source.replace(old,next);
  fs.writeFileSync(path,source,'utf8');
}
if(!source.includes("Report směny pro mistra"))throw Error('[17020 pre] report title missing');