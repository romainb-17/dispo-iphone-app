const $=(s)=>document.querySelector(s);
const modelSel=$('#model'), colorSel=$('#color'), capSel=$('#capacity');
const skuSpan=$('#sku'), tb=$('#tbody');
let MAP={};

async function loadMap(){ try{ const r=await fetch('./skus-fr.json?v=' + Date.now()); MAP=await r.json(); }catch{ MAP={}; } }
function setOpts(sel,arr){ sel.innerHTML=''; const ph=document.createElement('option'); ph.value=''; ph.textContent='— choisir —'; sel.appendChild(ph); for(const v of arr){ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o);} }
function refreshSku(){ const m=modelSel.value,c=colorSel.value,k=capSel.value; const sku=MAP?.[m]?.[c]?.[k]||null; skuSpan.textContent=sku||'(aucun)'; return sku; }
function onModel(){ const m=modelSel.value; if(!m||!MAP[m]){ setOpts(colorSel,[]); colorSel.disabled=true; setOpts(capSel,[]); capSel.disabled=true; refreshSku(); return; } setOpts(colorSel,Object.keys(MAP[m])); colorSel.disabled=false; setOpts(capSel,[]); capSel.disabled=true; refreshSku(); }
function onColor(){ const m=modelSel.value,c=colorSel.value; if(!m||!c||!MAP[m]?.[c]){ setOpts(capSel,[]); capSel.disabled=true; refreshSku(); return; } setOpts(capSel,Object.keys(MAP[m][c])); capSel.disabled=false; refreshSku(); }
function rowHtml(x){ const rows=x.availability?.length?x.availability:[{sku:'(n/a)',pickupDisplay:'unknown',storePickupQuote:''}]; return rows.map(p=>`<tr><td>${x.storeName||''}</td><td>${x.city||''}</td><td>${x.distanceWithUnit||''}</td><td class="sku">${p.sku||''}</td><td class="${p.pickupDisplay==='available'?'ok':'ko'}">${p.pickupDisplay||''}</td><td>${p.storePickupQuote||''}</td></tr>`).join(''); }
async function search(){ tb.innerHTML='<tr><td colspan="6">Recherche…</td></tr>'; const country=$('#country').value||'fr', location=$('#location').value.trim(), store=$('#store').value.trim(); const sku=refreshSku(); if(!sku){ tb.innerHTML='<tr><td colspan="6">⚠️ Sélectionne modèle/couleur/capacité (SKU manquant)</td></tr>'; return; } if(!location && !store){ tb.innerHTML='<tr><td colspan="6">⚠️ Ajoute location ou store</td></tr>'; return; } const qs=new URLSearchParams({country,skus:sku}); if(location) qs.set('location',location); if(store) qs.set('store',store); try{ const r=await fetch('/api/availability?'+qs.toString()); const j=await r.json(); if(!j.ok){ tb.innerHTML=`<tr><td colspan="6">Erreur: ${j.error||r.status}</td></tr>`; return; } tb.innerHTML=(j.results||[]).map(rowHtml).join('')||'<tr><td colspan="6">Aucun magasin retourné.</td></tr>'; }catch(e){ tb.innerHTML='<tr><td colspan="6">Erreur réseau</td></tr>'; } }
window.addEventListener('DOMContentLoaded', async ()=>{ await loadMap(); setOpts(modelSel,Object.keys(MAP)); modelSel.addEventListener('change', onModel); colorSel.addEventListener('change', onColor); capSel.addEventListener('change', refreshSku); $('#go').addEventListener('click', search); });

/* ====== Events (log des 50 derniers changements) ====== */
(function(){
  const TBID = 'eventsBody';
  const BTNID = 'eventsRefresh';

  const fmt = (d)=>{ try{ return new Date(d).toLocaleString('fr-FR'); }catch{ return d; } };
  const row = (e)=>{
    const badgeClass = e.to === 'available' ? 'ok' : 'ko';
    return `<tr>
      <td>${fmt(e.ts)}</td>
      <td>${e.storeName||''}</td>
      <td>${e.city||''}</td>
      <td class="sku">${e.sku||''}</td>
      <td class="${badgeClass}">${e.from||'?'} → ${e.to||'?'}</td>
      <td>${e.quote||''}</td>
    </tr>`;
  };

  async function loadEvents(){
    const tb = document.getElementById(TBID);
    if(!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="muted">Chargement…</td></tr>';
    try{
      const r = await fetch('/api/events?limit=50', { cache: 'no-store' });
      const j = await r.json();
      tb.innerHTML = (j.events||[]).map(row).join('') ||
        '<tr><td colspan="6" class="muted">Aucun événement pour l’instant…</td></tr>';
    }catch(e){
      console.error(e);
      tb.innerHTML = '<tr><td colspan="6">Erreur réseau</td></tr>';
    }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    loadEvents();
    setInterval(loadEvents, 60000);
    const btn = document.getElementById(BTNID);
    if (btn) btn.addEventListener('click', loadEvents);
  });
})();
