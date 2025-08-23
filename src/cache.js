// src/cache.js
const NS = 'dispo-cache-v1';

const hasWindow = typeof window !== 'undefined';
const hasLocalStorage = hasWindow && typeof window.localStorage !== 'undefined';

function keyFor(sku, cp) {
  return `${NS}:${sku || 'all'}:${cp || 'noCP'}`;
}

export function getCache(sku, cp) {
  if (!hasLocalStorage) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(sku, cp));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCache(sku, cp, data) {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem(keyFor(sku, cp), JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function isFresh(entry, maxAgeMs = 5 * 60 * 1000) {
  return entry && typeof entry.ts === 'number' && (Date.now() - entry.ts) < maxAgeMs;
}
