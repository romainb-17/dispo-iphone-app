const $ = (s)=>document.querySelector(s);
const tb = $('#tbody');

function rowHtml(x){
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
}

async function fetchAvailability({ country='fr', skus, storeCode, lat, lon }){
  if(!skus) return {ok:false,error:'no_skus'};
  const qs = new URLSearchParams({ country, skus });
  if(storeCode){ qs.set('store', storeCode); }
  else if(lat!=null && lon!=null){ qs.set('location', `${lat},${lon}`); }
  else { return {ok:false,error:'no_location_or_store'}; }
  const r = await fetch(`/api/availability?${qs.toString()}`);
  return await r.json();
}

async function fillTableForStore(store, country){
  const manual = $('#skus');
  const skus = manual && manual.value.trim()
    ? manual.value.split(',').map(s=>s.trim()).filter(Boolean).join(',')
    : (document.getElementById('sku')?.textContent||'').trim(); // support si UI dropdown existe
  if(!skus){ tb.innerHTML = '<tr><td colspan="6">⚠️ Ajoute un SKU (ou sélectionne via menus)</td></tr>'; return; }
  tb.innerHTML = '<tr><td colspan="6">Chargement…</td></tr>';
  const j = await fetchAvailability({ country, skus, storeCode: store.code||'', lat: store.lat, lon: store.lon });
  if(!j.ok){ tb.innerHTML = `<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`; return; }
  let rows = j.results || [];
  if(!store.code && rows.length>1){
    const parseKm = (s)=>{ const m=String(s).match(/([\d.,]+)/); if(!m) return 1/0; const n=parseFloat(m[1].replace(',','.')); return /mi\b|miles?/i.test(s)?n*1.60934:n; };
    rows = rows.sort((a,b)=>parseKm(a.distanceWithUnit)-parseKm(b.distanceWithUnit)).slice(0,1);
  }
  tb.innerHTML = rows.map(rowHtml).join('');
}

async function initMap(){
  const map = L.map('map', { zoomControl:true }).setView([46.6, 2.6], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);

  const stores = await (await fetch('/apple-stores-fr.json')).json();
  const layer = L.layerGroup().addTo(map);

  const countrySel = $('#country');
  const country = countrySel ? countrySel.value || 'fr' : 'fr';

  stores.forEach(s=>{
    const m = L.marker([s.lat, s.lon]).addTo(layer);
    const el = document.createElement('div');
    el.innerHTML = `<b>${s.name}</b><br>${s.city}<br><button id="btn">Voir le stock ici</button>`;
    m.bindPopup(el);
    m.on('popupopen', ()=>{ el.querySelector('#btn').onclick = ()=> fillTableForStore(s, (countrySel?.value||country)); });
  });

  // bouton Rechercher (si présent) garde son comportement
  const go = $('#go');
  if(go){
    go.addEventListener('click', async ()=>{
      const skusInput = $('#skus'); const skus = skusInput?.value?.split(',').map(s=>s.trim()).filter(Boolean).join(',') || '';
      if(!skus){ tb.innerHTML = '<tr><td colspan="6">⚠️ Donne au moins un SKU</td></tr>'; return; }
      const country = countrySel ? countrySel.value || 'fr' : 'fr';
      const location = document.getElementById('location')?.value?.trim() || '';
      const store = document.getElementById('store')?.value?.trim() || '';
      if(!location && !store){ tb.innerHTML = '<tr><td colspan="6">⚠️ Clique un store sur la carte ou renseigne location/store.</td></tr>'; return; }
      tb.innerHTML = '<tr><td colspan="6">Recherche…</td></tr>';
      const qs = new URLSearchParams({ country, skus });
      if(store) qs.set('store', store); else qs.set('location', location);
      const r = await fetch('/api/availability?'+qs.toString()); const j=await r.json();
      tb.innerHTML = j.ok ? (j.results||[]).map(rowHtml).join('') : `<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`;
    });
  }
}

document.addEventListener('DOMContentLoaded', initMap);
