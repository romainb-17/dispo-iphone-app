import crypto from 'crypto';
import { getModels } from '../models.js';
import { cachedJSON } from '../cache.js';
import { fetchPickupForParts, normalizeFulfillment } from '../sources/apple.js';
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '180', 10);
export async function checkAvailability(params){
  const { model, capacity, color, postal='', onlyAvailable=false } = params;
  const { partsMap } = getModels();
  const key = `${model}||${capacity}||${color}`;
  const parts = partsMap[key] || [];
  if (!parts.length) {
    const list = fallbackMock({ postal, onlyAvailable });
    return { mode: 'MOCK', parts: [], list };
  }
  const cacheKey = 'apple:'+crypto.createHash('md5').update(parts.join(',')+'|'+postal).digest('hex');
  const list = await cachedJSON(cacheKey, DEFAULT_TTL, async ()=>{
    const raw = await fetchPickupForParts({ parts, postal });
    return normalizeFulfillment(raw);
  });
  const filtered = onlyAvailable ? list.filter(r=>r.status==='ok') : list;
  return { mode: 'LIVE', parts, list: filtered };
}
function fallbackMock({ postal, onlyAvailable }){
  const stores=[
    { name:'Apple Store Opéra', city:'Paris', cp:'75009', distanceKm:2.1, pickup:"Aujourd'hui", status:'ok' },
    { name:'Apple Store Marché Saint-Germain', city:'Paris', cp:'75006', distanceKm:3.2, pickup:'Demain', status:'soon' },
    { name:'Apple Store La Défense', city:'Puteaux', cp:'92800', distanceKm:8.9, pickup:'—', status:'no' },
    { name:'Apple Store Parly 2', city:'Le Chesnay', cp:'78150', distanceKm:18.4, pickup:'Demain', status:'soon' },
    { name:'Apple Store Sainte-Catherine', city:'Bordeaux', cp:'33000', distanceKm:580, pickup:"Aujourd'hui", status:'ok' }
  ];
  let results=[...stores];
  if (/^\d{2}/.test(postal)) {
    const dept = postal.slice(0,2);
    results.sort((a,b)=> (a.cp.startsWith(dept)?-1:1) - (b.cp.startsWith(dept)?-1:1) || a.distanceKm-b.distanceKm);
  } else {
    results.sort((a,b)=>a.distanceKm-b.distanceKm);
  }
  return onlyAvailable ? results.filter(r=>r.status==='ok') : results;
}
