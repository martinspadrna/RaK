// RaK 2.0.41 – optional PNG rasterization for shift-overview only.
(function(root){
  'use strict';
  function raster(svg){
    const dimensions=svg.match(/^<svg[^>]*width="(\d+)" height="(\d+)"/);
    if(!dimensions) return Promise.reject(new Error('Neplatná velikost přehledu.'));
    const width=Number(dimensions[1]),height=Number(dimensions[2]);
    if(!(width>0&&height>0)) return Promise.reject(new Error('Neplatná velikost přehledu.'));
    const scale=Math.min(2,Math.sqrt(12000000/(width*height)),16384/Math.max(width,height));
    if(scale<0.35) return Promise.reject(new Error('Přehled je pro export příliš dlouhý.'));
    return new Promise((resolve,reject)=>{
      const imageUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
      const picture=new Image();
      picture.onload=()=>{
        URL.revokeObjectURL(imageUrl);
        try {
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.floor(width*scale));
          canvas.height=Math.max(1,Math.floor(height*scale));
          const context=canvas.getContext('2d');
          if(!context) throw new Error('Export obrázku není v tomto zařízení dostupný.');
          context.fillStyle='#fff';
          context.fillRect(0,0,canvas.width,canvas.height);
          context.drawImage(picture,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Převod na PNG se nezdařil.')),'image/png');
        } catch(error){reject(error);}
      };
      picture.onerror=()=>{URL.revokeObjectURL(imageUrl);reject(new Error('Nepodařilo se vykreslit PNG.'));};
      picture.src=imageUrl;
    });
  }
  async function save({rootEl,record,svg,share,authorized}){
    if(!authorized())return;
    const info=rootEl.querySelector('[data-shift-overview-export-status]');
    const buttons=Array.from(rootEl.querySelectorAll('[data-shift-overview-export]'));
    buttons.forEach(button=>{button.disabled=true;});
    if(info)info.textContent='Připravuji obrázek PNG…';
    try{
      const blob=await raster(svg);
      if(!authorized())return;
      const name='prehled-smeny-'+record.date+'-'+String(record.shift||'bez-smeny').replace(/[^a-zA-Z0-9-]/g,'-')+'.png';
      if(share&&navigator.share&&typeof File==='function'){
        const file=new File([blob],name,{type:'image/png'});
        if(navigator.canShare?.({files:[file]})){
          try{await navigator.share({files:[file],title:'Přehled směny'});if(info)info.textContent='Obrázek připraven ke sdílení.';return;}
          catch(error){if(error?.name==='AbortError'){if(info)info.textContent='Sdílení zrušeno.';return;}}
        }
      }
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      if(info)info.textContent='PNG připraveno ke stažení.';
    }catch(error){if(info)info.textContent='PNG se nepodařilo vytvořit: '+String(error?.message||error);}
    finally{buttons.forEach(button=>{if(button.isConnected)button.disabled=false;});}
  }
  root.RakShiftOverviewPngExporter=Object.freeze({raster,save});
})(typeof window!=='undefined'?window:globalThis);

/* Optional shift lock manager shares the existing lazy Admin bundle and offline asset. */
(function(root){
'use strict';
  function applySectionLocks(rootEl, readDom, records, clone, persistDraft, clearUndo, ownerAllowed, status) {
    const layout = rootEl.querySelector('[data-shift-overview-layout]');
    if (!layout || typeof layout.querySelectorAll !== 'function') return;
    const legacyKeys = ['soft','before-kiln','after-kiln','before-145','after-145','ground','stock','assembly'];
    layout.querySelectorAll('.rakShiftOverviewFlow > .rakShiftOverviewPanel').forEach((panel, index) => {
      panel.setAttribute('data-shift-overview-lock-id', legacyKeys[index] || 'stage-' + index);
    });
    const saved = records.get(rootEl) || {};
    const locks = saved.lockedSections || {};
    layout.querySelectorAll('[data-shift-overview-section], [data-shift-overview-lock-id]').forEach(section => {
      const id = section.getAttribute('data-shift-overview-section') || section.getAttribute('data-shift-overview-lock-id');
      const panel = section.matches('.rakShiftOverviewPanel') ? section : section.querySelector(':scope > .rakShiftOverviewPanel');
      const heading = panel && panel.querySelector(':scope > h3');
      if (!heading || !id) return;
      let button = heading.querySelector('[data-shift-overview-lock]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'rakShiftOverviewLock';
        button.setAttribute('data-shift-overview-lock', id);
        heading.appendChild(button);
      }
      const locked = locks[id] === true;
      button.textContent = locked ? '🔒' : '🔓';
      button.setAttribute('aria-pressed', String(locked));
      button.setAttribute('aria-label', (locked ? 'Odemknout blok ' : 'Zamknout blok ') + heading.firstChild.textContent.trim());
      button.title = locked ? 'Odemknout pro úpravy' : 'Zamknout proti přepsání';
      section.classList.toggle('isLocked', locked);
      section.querySelectorAll('input[data-shift-overview-field], textarea[data-shift-overview-field]').forEach(control => {
        control.readOnly = locked;
      });
      section.querySelectorAll('button:not([data-shift-overview-lock])').forEach(control => {
        control.disabled = locked;
      });
      section.querySelectorAll('select').forEach(control => {
        control.disabled = locked;
      });
    });
    if (rootEl.dataset.shiftLocksBound === '1') return;
    rootEl.dataset.shiftLocksBound = '1';
    rootEl.addEventListener('click', event => {
      const button = event.target.closest?.('[data-shift-overview-lock]');
      if (!button || !rootEl.contains(button)) return;
      event.preventDefault();
      if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
      const id = button.getAttribute('data-shift-overview-lock');
      if (!/^[a-z][a-z0-9-]{0,40}$/.test(id || '')) return;
      const record = readDom(rootEl);
      record.lockedSections = Object.assign({}, record.lockedSections);
      if (record.lockedSections[id]) delete record.lockedSections[id];
      else record.lockedSections[id] = true;
      records.set(rootEl, clone(record));
      rootEl.dataset.edited = '1';
      clearUndo(rootEl);
      applySectionLocks(rootEl, readDom, records, clone, persistDraft, clearUndo, ownerAllowed, status);
      persistDraft(rootEl);
    });

  }


root.rakApplyShiftOverviewLocks=applySectionLocks;
})(typeof window!=='undefined'?window:globalThis);
