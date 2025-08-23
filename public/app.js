async function main(){
  const $ = (s)=>document.querySelector(s);
  const modelSel = $('#model'), colorSel = $('#color'), capSel = $('#capacity');
  const skuOut = $('#sku'), tb = $('#tbody');

  let MAP = {};
  try { const r = await fetch('/skus-fr.json'); MAP = await r.json(); } catch(e){ MAP = {}; }

  const setOpts = (sel, arr)=>{
    sel.innerHTML=''; const ph=document.createElement('option'); ph.value=''; ph.textContent='— choisir —'; sel.appendChild(ph);
    for(const v of arr){ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); }
  };
  const capLabel = (k)=> (k==='1024'||k==='1TB') ? '1 To' : `${k} Go`;

  function refreshSku(){
    const m=modelSel.value, c=colorSel.value, k=capSel.value;
    const sku = MAP?.[m]?.[c]?.[k] || null;
    skuOut.textContent = sku || '(aucun)';
    return sku;
  }
  function onModel(){
    const m=modelSel.value;
    if(!m||!MAP[m]){ setOpts(colorSel, []); colorSel.disabled=true; setOpts(capSel, []); capSel.disabled=true; refreshSku(); return; }
    setOpts(colorSel, Object.keys(MAP[m])); colorSel.disabled=false;
    setOpts(capSel, []); capSel.disabled=true; refreshSku();
  }
  function onColor(){
    const m=modelSel.value, c=colorSel.value;
    if(!m||!c||!MAP[m]?.[c]){ setOpts(capSel, []); capSel.disabled=true; refreshSku(); return; }
    const caps = Object.keys(MAP[m][c]);
    setOpts(capSel, caps);
    [...capSel.options].forEach((o,i)=>{ if(i===0) return; o.textContent = capLabel(o.value); });
    capSel.disabled=false; refreshSku();
  }
  function onCapacity(){ refreshSku(); }

  async function search(){
    tb.innerHTML = '<tr><td colspan="6">Recherche…</td></tr>';
    const country = document.getElementById('country').value || 'fr';
    const location = document.getElementById('location').value.trim();
    const store = document.getElementById('store').value.trim();
    const sku = refreshSku();
    if(!sku){ tb.innerHTML = '<tr><td colspan="6">⚠️ Choisis modèle/couleur/capacité (SKU manquant)</td></tr>'; return; }
    if(!location && !store){ tb.innerHTML = '<tr><td colspan="6">⚠️ Renseigne location (CP/ville) ou store RXXX</td></tr>'; return; }

    const qs = new URLSearchParams({ country, skus: sku });
    if(location) qs.set('location', location);
    if(store) qs.set('store', store);

    try{
      const r = await fetch(`/api/availability?${qs.toString()}`);
      const json = await r.json();
      if(!json.ok){ tb.innerHTML = `<tr><td colspan="6">Erreur: ${json.error||r.status}</td></tr>`; return; }
      if(!json.results?.length){ tb.innerHTML = '<tr><td colspan="6">Aucun magasin retourné pour cette zone.</td></tr>'; return; }
      tb.innerHTML = json.results.map(x=>{
        const rows = x.availability?.length ? x.availability : [{sku:'(n/a)', pickupDisplay:'unknown', storePickupQuote:''}];
        return rows.map(p=>`
          <tr>
            <td>${x.storeName||''}</td>
            <td>${x.city||''}</td>
            <td>${x.distanceWithUnit||''}</td>
            <td class="sku">${p.sku||''}</td>
            <td class="${p.pickupDisplay==='available'?'ok':'ko'}">${p.pickupDisplay||''}</td>
            <td>${p.storePickupQuote||''}</td>
          </tr>`).join('');
      }).join('');
    }catch(e){ tb.innerHTML = '<tr><td colspan="6">Erreur réseau</td></tr>'; }
  }

  setOpts(modelSel, Object.keys(MAP));
  modelSel.addEventListener('change', onModel);
  colorSel.addEventListener('change', onColor);
  capSel.addEventListener('change', onCapacity);
  document.getElementById('go').addEventListener('click', search);
}
main();
