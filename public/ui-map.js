const $ = (s)=>document.querySelector(s);
const tb = $('#tbody');
const setTB = (html)=>{ if(tb) tb.innerHTML = html; };

async function ensureLeaflet(){
  if (window.L) return;
  const add = (tag, attrs) => { const el=document.createElement(tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,v); document.head.appendChild(el); return el; };
  if (!document.querySelector('link[href*="leaflet.css"]')) add('link',{rel:'stylesheet',href:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'});
  await new Promise((resolve)=>{
    const s1 = add('script',{src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'});
    s1.onload = resolve;
    s1.onerror = ()=>{ const s2 = add('script',{src:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'}); s2.onload = resolve; };
  });
}

function ensureMapDiv(){
  let el = document.getElementById('map');
  if (!el) {
    el = Object.assign(document.createElement('div'), {id:'map'});
    el.style.cssText = 'height:60vh;min-height:420px;width:100%;border-radius:12px;overflow:hidden;position:relative';
    const anchor = document.querySelector('table') || document.body;
    (anchor.parentNode || document.body).insertBefore(el, anchor.nextSibling);
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
  if(storeCode) qs.set('store', storeCode);
  else if(lat!=null && lon!=null) qs.set('location', `${lat},${lon}`);
  else return {ok:false,error:'no_location_or_store'};
  const r = await fetch(`/api/availability?${qs.toString()}`);
  return await r.json();
}

async function fillTableForStore(store, country){
  const manual = $('#skus');
  const skus = manual?.value?.trim()
    ? manual.value.split(',').map(s=>s.trim()).filter(Boolean).join(',')
    : (document.getElementById('sku')?.textContent||'').trim();
  if(!skus){ setTB('<tr><td colspan="6">⚠️ Ajoute un SKU (ou sélectionne via menus)</td></tr>'); return; }
  setTB('<tr><td colspan="6">Chargement…</td></tr>');
  try{
    const j = await fetchAvailability({ country, skus, storeCode: store.code||'', lat: store.lat, lon: store.lon });
    if(!j.ok){ setTB(`<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`); return; }
    let rows = j.results || [];
    if(!store.code && rows.length>1){
      const parseKm = (s)=>{ const m=String(s).match(/([\d.,]+)/); if(!m) return 1/0; const n=parseFloat(m[1].replace(',','.')); return /mi\b|miles?/i.test(s)?n*1.60934:n; };
      rows = rows.sort((a,b)=>parseKm(a.distanceWithUnit)-parseKm(b.distanceWithUnit)).slice(0,1);
    }
    setTB(rows.map(rowHtml).join(''));
  } catch(err){
    setTB('<tr><td colspan="6">Erreur réseau</td></tr>');
    console.error(err);
  }
}

async function getStores(){
  try{
    const r = await fetch('apple-stores-fr.json',{cache:'no-store'});
    if(!r.ok) throw 0;
    return await r.json();
  }catch(e){
    console.warn('Stores JSON introuvable; fallback');
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

  map.whenReady(()=> setTimeout(()=>map.invalidateSize(), 0));
  window.addEventListener('resize', ()=> map.invalidateSize());

  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
  });

  const stores = await getStores();
  const layer = L.layerGroup().addTo(map);
  const countrySel = document.querySelector('#country');
  const country = countrySel?.value || 'fr';

  stores.forEach(s=>{
    const m = L.marker([s.lat, s.lon], {icon: DefaultIcon}).addTo(layer);
    const el = document.createElement('div');
    el.innerHTML = `<b>${s.name}</b><br>${s.city}<br>`;
    const btn = document.createElement('button');
    btn.textContent = 'Voir le stock ici';
    el.appendChild(btn);
    m.bindPopup(el);
    m.on('popupopen', ()=>{ btn.onclick = ()=> fillTableForStore(s, (countrySel?.value||country)); });
  });

  const go = document.querySelector('#go');
  if(go){
    go.addEventListener('click', async ()=>{
      const skusInput = document.querySelector('#skus');
      const skus = skusInput?.value?.split(',').map(s=>s.trim()).filter(Boolean).join(',') || '';
      if(!skus){ setTB('<tr><td colspan="6">⚠️ Donne au moins un SKU</td></tr>'); return; }
      const country = countrySel?.value || 'fr';
      const location = document.getElementById('location')?.value?.trim() || '';
      const store = document.getElementById('store')?.value?.trim() || '';
      if(!location && !store){ setTB('<tr><td colspan="6">⚠️ Clique un store sur la carte ou renseigne location/store.</td></tr>'); return; }
      setTB('<tr><td colspan="6">Recherche…</td></tr>');
      try{
        const qs = new URLSearchParams({ country, skus });
        if(store) qs.set('store', store); else qs.set('location', location);
        const r = await fetch('/api/availability?'+qs.toString());
        const j = await r.json();
        setTB(j.ok ? (j.results||[]).map(rowHtml).join('') : `<tr><td colspan="6">Erreur: ${j.error||'upstream'}</td></tr>`);
      } catch(err){
        setTB('<tr><td colspan="6">Erreur réseau</td></tr>');
        console.error(err);
      }
    });
  }
}
document.addEventListener('DOMContentLoaded', initMap);
