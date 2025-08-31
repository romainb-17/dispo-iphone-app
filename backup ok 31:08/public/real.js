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

async function search(){
  tb.innerHTML = '<tr><td colspan="6">Recherche…</td></tr>';
  const country = $('#country').value || 'fr';
  const location = $('#location').value.trim();
  const store = $('#store').value.trim();
  const skus = $('#skus').value.split(',').map(s=>s.trim()).filter(Boolean).join(',');
  if(!skus){ tb.innerHTML = '<tr><td colspan="6">⚠️ Ajoute des SKUs</td></tr>'; return; }
  if(!location && !store){ tb.innerHTML = '<tr><td colspan="6">⚠️ Ajoute location ou store</td></tr>'; return; }

  const qs = new URLSearchParams({ country, skus });
  if(location) qs.set('location', location);
  if(store) qs.set('store', store);
  try{
    const r = await fetch(`/api/availability?${qs.toString()}`);
    const json = await r.json();
    if(!json.ok){ tb.innerHTML = `<tr><td colspan="6">Erreur: ${json.error||r.status}</td></tr>`; return; }
    tb.innerHTML = json.results.map(rowHtml).join('');
  }catch(e){ tb.innerHTML = '<tr><td colspan="6">Erreur réseau</td></tr>'; }
}

$('#go').addEventListener('click', search);
