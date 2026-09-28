(function(){'use strict';
  var params;
  try{params=new URLSearchParams(window.location.search||'')}catch(_){return}
  if(params.get('p24_diag_seed')!=='1')return;
  if(!/\.vercel\.app$/i.test(String(window.location.hostname||'')))return;
  var key='rotace_supabase_queue_v1';
  var status='';
  try{
    var raw=localStorage.getItem(key);
    var queue=raw?JSON.parse(raw):[];
    if(!Array.isArray(queue)){status='P2.4 TEST nebyl spuštěn: lokální fronta nemá platný formát.'}
    else if(queue.length){status='P2.4 TEST nic nezměnil: lokální fronta už obsahuje '+queue.length+' položek.'}
    else{
      queue=[{
        id:'p24-machine-'+Date.now(),
        queuedAt:new Date().toISOString(),
        type:'machine_settings',
        rows:[],
        conflict:'admin-review-required',
        retryCount:0,
        p24DiagnosticTestOnly:true
      }];
      var encoded=JSON.stringify(queue);
      localStorage.setItem(key,encoded);
      if(localStorage.getItem(key)!==encoded)throw new Error('queue verification failed');
      status='P2.4 TEST připraven: 1 lokální konflikt nastavení strojů. Na server nebylo nic zapsáno.';
    }
  }catch(_){
    status='P2.4 TEST se nepodařilo bezpečně připravit. Na server nebylo nic zapsáno.';
  }
  try{
    params.delete('p24_diag_seed');
    var next=window.location.pathname+(params.toString()?'?'+params.toString():'')+window.location.hash;
    window.history.replaceState(null,'',next);
  }catch(_){}
  var show=function(){try{window.alert(status)}catch(_){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else setTimeout(show,0);
})();
