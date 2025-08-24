const $ = (s)=>document.querySelector(s);
const tb = $('#tbody');

// Ajoute Leaflet si non chargé (fallback CDN)
async function ensureLeaflet(){
  if (window.L) return;
  const add = (tag, attrs) => { const el=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v)); document.head.appendChild(el); return el; };
  if (!document.querySelector('link[href*="leaflet.css"]')) add('link',{rel:'stylesheet',href:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'});
  await new Promise((resolve)=>{
    const s1 = add('script',{src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'});
    s1.onload = resolve;
    s1.onerror = ()=>{
      const s2 = add('script',{src:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'});
      s2.onload = resolve;
    };
  });
}

// Crée le conteneur si absent
function ensureMapDiv(){
  let el = document.getElementById('map');
  if (!el) {
    el = document.createElement('div');
    el.id = 'map';
    el.style.height = '480px';
    el.style.marginTop = '14px';
    el.style.borderRadius = '12px';
    el.style.overflow = 'hidden';
    const anchor = document.querySelector('table') || document.body;
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  }
  return el;
}

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
    : (document.getElementById('sku')?.textContent||'').trim();
  if(!skus){ tb.innerHTML = '<tr><td colspan="6">⚠️ Ajoute un SKU (ou sélectionne via menus)</td></tr>'; return; }
  tb.innerHTML = '<tr><td colspan="6">Chargement…</td></tr>';
  try{
    const j = await fetchAvailability({ country, skus, storeCode: store.code||'', lat: store.lat, lon: store.lon });
    if(!j.ok){ tb.innerHTML = `<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`; return; }
    let rows = j.results || [];
    if(!store.code && rows.length>1){
      const parseKm = (s)=>{ const m=String(s).match(/([\d.,]+)/); if(!m) return 1/0; const n=parseFloat(m[1].replace(',','.')); return /mi\b|miles?/i.test(s)?n*1.60934:n; };
      rows = rows.sort((a,b)=>parseKm(a.distanceWithUnit)-parseKm(b.distanceWithUnit)).slice(0,1);
    }
    tb.innerHTML = rows.map(rowHtml).join('');
  } catch(err){
    tb.innerHTML = `<tr><td colspan="6">Erreur réseau</td></tr>`;
    console.error(err);
  }
}

async function getStores(){
  // IMPORTANT: chemin RELATIF (OK si site servi sous /quelquechose/)
  const url = 'apple-stores-fr.json';
  try{
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('stores_json_'+r.status);
    return await r.json();
  } catch(e){
    console.warn('Stores JSON introuvable, fallback minimal', e);
    return [
      {"name":"Apple Nantes Atlantis","city":"Saint-Herblain","lat":47.2131,"lon":-1.6339,"code":""},
      {"name":"Apple Bordeaux Sainte-Catherine","city":"Bordeaux","lat":44.8386,"lon":-0.5722,"code":""},
      {"name":"Apple Lyon Part-Dieu","city":"Lyon","lat":45.7604,"lon":4.8615,"code":""},
      {"name":"Apple Champs-Élysées","city":"Paris","lat":48.8708,"lon":2.3046,"code":""}
    ];
  }
}

async function initMap(){
  ensureMapDiv();
  await ensureLeaflet();
  const map = L.map('map', { zoomControl:true }).setView([46.6, 2.6], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(map);

  const stores = await getStores();
  const layer = L.layerGroup().addTo(map);

  const countrySel = $('#country');
  const country = countrySel ? countrySel.value || 'fr' : 'fr';

  stores.forEach(s=>{
    const m = L.marker([s.lat, s.lon]).addTo(layer);
    const el = document.createElement('div');
    el.innerHTML = `<b>${s.name}</b><br>${s.city}<br>`;
    const btn = document.createElement('button');
    btn.textContent = 'Voir le stock ici';
    el.appendChild(btn);
    m.bindPopup(el);
    m.on('popupopen', ()=>{ btn.onclick = ()=> fillTableForStore(s, (countrySel?.value||country)); });
  });

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
      try{
        const qs = new URLSearchParams({ country, skus });
        if(store) qs.set('store', store); else qs.set('location', location);
        const r = await fetch('/api/availability?'+qs.toString());
        const j = await r.json();
        tb.innerHTML = j.ok ? (j.results||[]).map(rowHtml).join('') : `<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`;
      } catch(err){
        tb.innerHTML = `<tr><td colspan="6">Erreur réseau</td></tr>`;
        console.error(err);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initMap);
