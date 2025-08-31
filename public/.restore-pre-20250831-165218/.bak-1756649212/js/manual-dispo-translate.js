(function(){
  function findDispoIdx(){
    const thead = document.querySelector('#tbody')?.closest('table')?.querySelector('thead');
    if(!thead) return -1;
    const ths = [...thead.querySelectorAll('th')].map(th => (th.textContent||'').trim().toLowerCase());
    const candidates = ['dispo','disponibilité','availability','status','statut'];
    for (const c of candidates){
      const i = ths.indexOf(c);
      if (i >= 0) return i;
    }
    return ths.findIndex(t => /dispo|avail|stat/i.test(t));
  }

  function translateCell(td){
    if(!td) return;
    const raw = (td.textContent || '').trim();
    const low = raw.toLowerCase();

    if (/^\s*disponible\s*$/i.test(raw)){ td.textContent='Disponible'; td.style.color='#118a00'; td.style.fontWeight='600'; return; }
    if (/^\s*indisponible\s*$/i.test(raw)){ td.textContent='Indisponible'; td.style.color='#c60000'; td.style.fontWeight='600'; return; }

    const POS = /\bavailable\b|\bready\b|\bpickup (today|now)\b|^1$|\btrue\b|\bok\b/i;
    const NEG = /\bunavailable\b|\bineligible\b|indisponible|not available|sold out|out of stock|^0$|\bfalse\b|\bko\b|n\/?a/i;

    if (NEG.test(low)){ td.textContent='Indisponible'; td.style.color='#c60000'; td.style.fontWeight='600'; return; }
    if (POS.test(low)){ td.textContent='Disponible'; td.style.color='#118a00'; td.style.fontWeight='600'; return; }
  }

  function translateAll(){
    const tbody = document.getElementById('tbody');
    if(!tbody) return;
    const dispoIdx = findDispoIdx();
    if (dispoIdx < 0) return;
    tbody.querySelectorAll('tr').forEach(tr=>{
      if (tr.querySelector('td[colspan]')) return;
      const tds = tr.children;
      if (tds[dispoIdx]) translateCell(tds[dispoIdx]);
    });
  }

  function boot(){
    const tbody = document.getElementById('tbody');
    if(!tbody) return;
    translateAll();

    const obs = new MutationObserver(muts=>{
      const dispoIdx = findDispoIdx();
      muts.forEach(m=>{
        if (m.type === 'characterData'){
          const td = m.target.parentElement;
          const tr = td?.closest('tr');
          if (tr && tr.parentElement === tbody){
            const i = [...tr.children].indexOf(td);
            if (i === dispoIdx) translateCell(td);
          }
        }
        m.addedNodes.forEach(n=>{
          if (n.nodeType===1 && n.tagName==='TR' && !n.querySelector('td[colspan]')){
            const tds = n.children;
            if (tds[dispoIdx]) translateCell(tds[dispoIdx]);
          }
        });
      });
    });
    obs.observe(tbody,{childList:true,subtree:true,characterData:true});

    let ticks = 0;
    const iv = setInterval(()=>{
      translateAll();
      if (++ticks > 60) clearInterval(iv);
    }, 1000);

    console.log('[manual-dispo-translate] actif');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
