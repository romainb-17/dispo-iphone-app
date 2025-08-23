// src/services/searchNearest.js
import { geocodePostalCodeFR } from './geocode.js';
import { nearestStoreTo } from './stores.js';
import { getCache, setCache, isFresh } from '../cache.js';

export async function findNearestAndCache({ sku, postalCode, maxAgeMs = 2 * 60 * 1000, force = false }) {
  const cached = getCache(sku, postalCode);
  if (!force && isFresh(cached, maxAgeMs)) return cached.data;

  const geo = await geocodePostalCodeFR(postalCode);
  const store = nearestStoreTo(geo);

  const result = {
    input: { sku, postalCode },
    geocode: geo,
    store: {
      id: store.id,
      name: store.name,
      distanceKm: Math.round(store.distanceKm * 10) / 10
    }
  };

  setCache(sku, postalCode, result);
  return result;
}
