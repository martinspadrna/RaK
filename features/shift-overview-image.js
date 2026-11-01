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
