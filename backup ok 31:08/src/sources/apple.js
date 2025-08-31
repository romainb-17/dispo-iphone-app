const BASE='https://www.apple.com';
function buildURL({ country='fr', parts=[], location, store }){
  const u=new URL(`${BASE}/${country}/shop/fulfillment-messages`);
  parts.forEach((p,i)=>u.searchParams.append(`parts.${i}`, p));
  if(location) u.searchParams.set('location', location);
  if(store) u.searchParams.set('store', store);
  u.searchParams.set('searchNearby','true');
  u.searchParams.set('pl','true');
  return u.toString();
}
export async function fetchPickupForParts({ parts, postal, country=process.env.APPLE_COUNTRY || 'fr' }){
  if(!parts || !parts.length) return null;
  const url = buildURL({ country, parts, location: postal });
  const resp = await fetch(url, {
    headers: {
      'Accept':'application/json, text/javascript, */*; q=0.01',
      'User-Agent':'Mozilla/5.0 (compatible; Dispo-iPhone/1.0)',
      'Accept-Language':'fr-FR,fr;q=0.9',
      'X-Requested-With':'XMLHttpRequest'
    }
  });
  if(!resp.ok) throw new Error(`Apple fulfillment fetch failed: ${resp.status}`);
  return resp.json();
}
export function normalizeFulfillment(json){
  const stores=(json?.body?.content?.pickupMessage?.stores)||[];
  const sanitized = stores.map(s=>{
    const pa = s.partsAvailability || {};
    const anyAvail = Object.values(pa).some(p=>{
      const d = (p?.pickupDisplay||'').toLowerCase();
      return d.includes('available') || d.includes('in stock') || d.includes('disponible');
    });
    const one = Object.values(pa)[0] || {};
    const pickup = one?.storePickupQuote || one?.pickupSearchQuote || '—';
    let distanceKm = null;
    if (s.storeDistanceWithUnit) {
      const num = String(s.storeDistanceWithUnit).replace(',', '.').match(/([\d.]+)/);
      distanceKm = num ? parseFloat(num[1]) : null;
    }
    if (distanceKm==null) {
      const raw = s.storetownDistance ?? s.distance ?? s.distanceWithUnit;
      const num = String(raw||'').replace(',', '.').match(/([\d.]+)/);
      distanceKm = num ? parseFloat(num[1]) : 0;
    }
    let status='no';
    if (anyAvail) status='ok';
    else if (Object.values(pa).some(p => String(p?.pickupDisplay||'').toLowerCase().includes('soon') || String(p?.pickupSearchQuote||'').toLowerCase().includes('bientôt'))) status='soon';
    return {
      name: s.storeName || s.address?.address || 'Apple Store',
      city: s.city || s.address?.city || '',
      cp: s.address?.postalCode || '',
      distanceKm,
      pickup,
      status
    };
  });
  return sanitized.sort((a,b)=> (a.distanceKm||9999)-(b.distanceKm||9999));
}
