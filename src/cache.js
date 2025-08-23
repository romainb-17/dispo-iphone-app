// src/cache.js
// Cache unifié navigateur (localStorage) & serveur (mémoire) + helper cachedJSON

const NS = 'dispo-cache-v1';
const isBrowser = typeof window !== 'undefined';
const hasLocalStorage = isBrowser && typeof window.localStorage !== 'undefined';

// Petit cache mémoire côté serveur (ou fallback navigateur si pas de localStorage)
const mem = (globalThis.__APP_MEMCACHE ||= new Map());

function keyFor(skuOrKey, cp) {
  // supporte 2 usages: (sku, cp) OU (key)
  if (cp !== undefined) return `${NS}:${skuOrKey || 'all'}:${cp || 'noCP'}`;
  return `${NS}:${skuOrKey}`;
}

function _getRaw(k) {
  if (hasLocalStorage) {
    try { return window.localStorage.getItem(k); } catch { return null; }
  }
  return mem.get(k) ?? null;
}

function _setRaw(k, v) {
  if (hasLocalStorage) {
    try { window.localStorage.setItem(k, v); } catch {}
  } else {
    mem.set(k, v);
  }
}

export function getCache(skuOrKey, cp) {
  const k = keyFor(skuOrKey, cp);
  const raw = _getRaw(k);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setCache(skuOrKey, cp, data) {
  const k = keyFor(skuOrKey, cp);
  const payload = JSON.stringify({ data, ts: Date.now() });
  _setRaw(k, payload);
}

export function isFresh(entry, maxAgeMs = 5 * 60 * 1000) {
  return entry && typeof entry.ts === 'number' && (Date.now() - entry.ts) < maxAgeMs;
}

/**
 * cachedJSON(key[, producerOrOptions][, maxAgeMs])
 *
 * - key: string (identifiant de cache). Si c'est une URL http(s), on fera un fetch JSON par défaut.
 * - producerOrOptions:
 *      * function async () => any    (producteur de données)
 *      * ou { producer, fetchInit }  (options)
 * - maxAgeMs: nombre de millisecondes (TTL). Défaut: 5 minutes.
 *
 * Exemples:
 *   await cachedJSON('https://api.exemple.com/foo');             // fetch JSON (5 min)
 *   await cachedJSON('key:foo', async () => compute(), 60000);   // producteur custom (1 min)
 */
export async function cachedJSON(key, producerOrOptions, maxAgeMs = 5 * 60 * 1000) {
  const cached = getCache(key);
  if (isFresh(cached, maxAgeMs)) return cached.data;

  let producer = null;
  let fetchInit = undefined;

  if (typeof producerOrOptions === 'function') {
    producer = producerOrOptions;
  } else if (producerOrOptions && typeof producerOrOptions === 'object') {
    producer = producerOrOptions.producer || null;
    fetchInit = producerOrOptions.fetchInit;
  }

  let data;
  if (producer) {
    data = await producer();
  } else if (typeof key === 'string' && /^https?:\/\//i.test(key)) {
    // fetch JSON par défaut si key est une URL
    const res = await fetch(key, fetchInit);
    if (!res.ok) throw new Error(`cachedJSON fetch failed: ${res.status}`);
    data = await res.json();
  } else {
    throw new Error('cachedJSON: no producer and key is not an URL');
  }

  setCache(key, undefined, data);
  return data;
}

export default {
  getCache,
  setCache,
  isFresh,
  cachedJSON,
};
