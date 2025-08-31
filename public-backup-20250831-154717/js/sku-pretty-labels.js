(function(){
  let INDEX=null, READY=false;

  // Apple part number (ex: MTUW3ZD/A, MYNE3ZD/A, MQ9G3ZA/A…)
  const PN_RE=/^[A-Z0-9]{4,}[A-Z0-9]?[A-Z]{2}\/A$/;

  async function loadIndex(){
    if(READY) return INDEX||{};
    async function j(u){ try{ const r=await fetch(u+'?v='+Date.now(),{cache:'no-store'}); return r.ok?await r.json():{}; }catch{ return {}; } }
    const [base,ov] = await Promise.all([ j('/sku_index.min.json'), j('/sku_overrides.json') ]);
    INDEX = Object.assign({}, base||{}, ov||{});
    READY = true;
    return INDEX;
  }

  function normalizeKey(s){
    return (s||'').toUpperCase().replace(/\s+/g,'');
  }

  function compose(meta, fallback){
    const model    = meta?.model    || fallback || '—';
    const color    = meta?.color    || '—';
    const capacity = meta?.capacity || '—';
    return `${model} · ${color} · ${capacity}`;
  }

  async function prettifyCell(td){
    if(!td || td.dataset._sku_pretty==='1') return;
    const text=(td.textContent||'').trim().toUpperCase();
    if(!PN_RE.test(text)) return; // pas un part number Apple

    const idx = await loadIndex();
    const key = normalizeKey(text);
    const meta = idx[key] || idx[key.replace(/\s+/g,'')] || null;

    td.textContent = compose(meta, text);
    td.dataset._sku_pretty='1';
  }

  async function scan(root){
    const tds = [...(root||document).querySelectorAll('td')];
    for (const td of tds){ await prettifyCell(td); }
  }

  function observe(){
    const obs=new MutationObserver(async muts=>{
      for(const m of muts){
        for(const n of m.addedNodes){
          if(n.nodeType!==1) continue;
          if(n.tagName==='TD') await prettifyCell(n);
          else await scan(n);
        }
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  // Boot
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', async ()=>{ await scan(document); observe(); });
  }else{
    scan(document); observe();
  }
})();
