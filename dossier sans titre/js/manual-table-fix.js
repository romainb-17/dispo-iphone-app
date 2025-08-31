(function(){
  let IDX=null, READY=false;

  async function loadIdx(){
    if(READY) return IDX;
    async function j(u){ try{ const r=await fetch(u+'?v='+Date.now(),{cache:'no-store'}); return r.ok?await r.json():{}; }catch{ return {}; } }
    const [base, ov] = await Promise.all([ j('/sku_index.min.json'), j('/sku_overrides.json') ]);
    IDX = Object.assign({}, base, ov);
    READY = true; return IDX;
  }

  function getManualTable(){
    const tbody = document.getElementById('tbody');
    const table = tbody?.closest('table');
    const thead = table?.querySelector('thead');
    return {tbody, table, thead};
  }

  function ensureHeader(thead){
    if(!thead) return {skuIdx:-1, dispoIdx:-1};
    const ths=[...thead.querySelectorAll('th')];
    const names=ths.map(th=>(th.textContent||'').trim().toLowerCase());
    let skuIdx = names.indexOf('sku');
    const dispoIdx = names.indexOf('dispo');

    if (names.includes('modèle') && names.includes('capacité') && names.includes('couleur')) {
      return { skuIdx: names.indexOf('modèle'), dispoIdx };
    }

    if (skuIdx>=0){
      ths[skuIdx].textContent='Modèle';
      const thCap=document.createElement('th'); thCap.textContent='Capacité';
      const thCol=document.createElement('th'); thCol.textContent='Couleur';
      ths[skuIdx].after(thCap, thCol);
    }
    const ths2=[...thead.querySelectorAll('th')].map(th=>(th.textContent||'').trim().toLowerCase());
    return { skuIdx: ths2.indexOf('modèle'), dispoIdx: ths2.indexOf('dispo') };
  }

  const mcc = (meta, skuText) => {
    const m = meta?.model || (skuText||'').toUpperCase();
    const c = meta?.capacity || '—';
    const o = meta?.color || '—';
    return {model:m, capacity:c, color:o};
  };

  function translateDispoCell(td){
    const raw=(td.textContent||'').trim().toLowerCase();
    let label=null, color=null;
    if (/available/.test(raw) || /oui|ok|true|1/.test(raw)) { label='Disponible'; color='#118a00'; }
    else if (/unavailable|ineligible|inéligible|sold out|out of stock|ko|false|0/.test(raw)) { label='Indisponible'; color='#c60000'; }
    if (label){ td.textContent=label; td.style.color=color; td.style.fontWeight='600'; }
  }

  async function patchRow(tr, idx){
    if (!tr || tr.dataset._manual_mcc==='1') return;
    const idxMap = await loadIdx();

    const tds=[...tr.children];
    if (idx.dispoIdx>=0 && tds[idx.dispoIdx]) translateDispoCell(tds[idx.dispoIdx]);

    const skuTd = idx.skuIdx>=0 ? tds[idx.skuIdx] : null;
    if (skuTd){
      const skuText=(skuTd.textContent||'').trim();
      const meta = idxMap[skuText] || idxMap[skuText.replace(/\s+/g,'')] || idxMap[(skuText||'').toUpperCase()] || null;
      const {model,capacity,color} = mcc(meta, skuText);

      skuTd.textContent = model;

      const after = skuTd.nextSibling;
      const tdCap=document.createElement('td'); tdCap.textContent=capacity; tdCap.className='cell-capacity';
      const tdCol=document.createElement('td'); tdCol.textContent=color;    tdCol.className='cell-color';
      tr.insertBefore(tdCap, after);
      tr.insertBefore(tdCol, after);
    }

    tr.dataset._manual_mcc='1';
  }

  function boot(){
    const {tbody, table, thead} = getManualTable();
    if (!tbody || !table) return;

    const idx = ensureHeader(thead);

    [...tbody.querySelectorAll('tr')].forEach(tr=>{
      if (tr.querySelector('td[colspan]')) return;
      patchRow(tr, idx);
    });

    const obs=new MutationObserver(muts=>{
      muts.forEach(m=> m.addedNodes.forEach(n=>{
        if(n.nodeType===1 && n.tagName==='TR'){
          if (n.querySelector('td[colspan]')) return;
          patchRow(n, idx);
        }
      }));
    });
    obs.observe(tbody,{childList:true});
    console.log('[manual-table-fix] actif');
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
