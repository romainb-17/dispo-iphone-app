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
      'Accept-Language':'fr-FR,fr;q=0.9'
    }
  });
  if(!resp.ok) throw new Error(`Apple fulfillment fetch failed: ${resp.status}`);
  return resp.json();
}
export function normalizeFulfillment(json){
  const stores=(json?.body?.content?.pickupMessage?.stores)||[];
  return stores.map(s=>{
    const anyAvail = Object.values(s.partsAvailability||{}).some(p=>{
      const d = p?.pickupDisplay;
      return d==='available' || d==='inStock' || d==='availableForPickup';
    });
    const one = Object.values(s.partsAvailability||{})[0] || {};
    const pickup = one?.storePickupQuote || one?.pickupSearchQuote || '—';
    let status='no';
    if (anyAvail) status='ok';
    else if (Object.values(s.partsAvailability||{}).some(p => String(p?.pickupDisplay||'').includes('soon'))) status='soon';
    return {
      name: s.storeName || s.address?.address || 'Apple Store',
      city: s.city || s.address?.city || '',
      cp: s.address?.postalCode || '',
      distanceKm: s.storetownDistance || s.distance || 0,
      pickup,
      status
    };
  });
}
