(function(){'use strict';
  var params;
  try{params=new URLSearchParams(window.location.search||'')}catch(_){return}
  if(params.get('p23_rescue_seed')!=='1')return;
  if(!/\.vercel\.app$/i.test(String(window.location.hostname||'')))return;
  var key='rotace_supabase_queue_v1';
  var now=new Date().toISOString();
  var status='';

  try{
    var raw=localStorage.getItem(key);
    var queue=raw?JSON.parse(raw):[];
    if(!Array.isArray(queue)){status='Lokální fronta není platné pole. Test nebyl spuštěn.'}
    else if(queue.length){status='Lokální fronta už obsahuje '+queue.length+' položek. Test nic nezměnil.'}
    else{
      queue=[
        {id:'p23-machine-'+Date.now(),queuedAt:now,type:'machine_settings',rows:[],conflict:'admin-review-required',retryCount:0,p23TestOnly:true},
        {id:'p23-other-'+Date.now(),queuedAt:now,type:'bug_report',entry:{id:'p23-local-only'},conflict:'manual-review-required',retryCount:0,p23TestOnly:true}
      ];
      var encoded=JSON.stringify(queue);
      localStorage.setItem(key,encoded);
      if(localStorage.getItem(key)!==encoded)throw new Error('queue verification failed');
      status='P2.3 TEST připraven: 2 lokální konflikty (stroj + ostatní). Na server nebylo nic zapsáno.';
    }
  }catch(_){status='P2.3 TEST se nepodařilo bezpečně připravit. Nic nebylo změněno.'}

  try{
    params.delete('p23_rescue_seed');
    var next=window.location.pathname+(params.toString()?'?'+params.toString():'')+window.location.hash;
    window.history.replaceState(null,'',next);
  }catch(_){}

  function show(){try{window.alert(status)}catch(_){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else setTimeout(show,0);
})();
