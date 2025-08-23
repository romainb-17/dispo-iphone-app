#!/usr/bin/env bash
set -euo pipefail

echo "▶️  Préparation…"
mkdir -p data src/services src/sources public

# 1) SKUs FR complets (JSON sans commentaires)
cat > data/apple_fr_skus.json <<'EOF'
{
  "meta": { "country": "fr", "note": "SKUs FR (ZD/A) pour iPhone 16, 16 Plus, 16 Pro, 16 Pro Max" },
  "products": [
    { "model": "iPhone 16", "capacity": "128 Go", "color": "Noir",  "partNumber": ["MTUW3ZD/A"] },
    { "model": "iPhone 16", "capacity": "256 Go", "color": "Noir",  "partNumber": ["MTUX3ZD/A"] },
    { "model": "iPhone 16", "capacity": "512 Go", "color": "Noir",  "partNumber": ["MTUY3ZD/A"] },
    { "model": "iPhone 16", "capacity": "128 Go", "color": "Bleu",  "partNumber": ["MTUZ3ZD/A"] },
    { "model": "iPhone 16", "capacity": "256 Go", "color": "Bleu",  "partNumber": ["MTV03ZD/A"] },
    { "model": "iPhone 16", "capacity": "512 Go", "color": "Bleu",  "partNumber": ["MTV13ZD/A"] },
    { "model": "iPhone 16", "capacity": "128 Go", "color": "Rose",  "partNumber": ["MTV23ZD/A"] },
    { "model": "iPhone 16", "capacity": "256 Go", "color": "Rose",  "partNumber": ["MTV33ZD/A"] },
    { "model": "iPhone 16", "capacity": "512 Go", "color": "Rose",  "partNumber": ["MTV43ZD/A"] },
    { "model": "iPhone 16", "capacity": "128 Go", "color": "Jaune", "partNumber": ["MTV53ZD/A"] },
    { "model": "iPhone 16", "capacity": "256 Go", "color": "Jaune", "partNumber": ["MTV63ZD/A"] },
    { "model": "iPhone 16", "capacity": "512 Go", "color": "Jaune", "partNumber": ["MTV73ZD/A"] },
    { "model": "iPhone 16", "capacity": "128 Go", "color": "Vert",  "partNumber": ["MTV83ZD/A"] },
    { "model": "iPhone 16", "capacity": "256 Go", "color": "Vert",  "partNumber": ["MTV93ZD/A"] },
    { "model": "iPhone 16", "capacity": "512 Go", "color": "Vert",  "partNumber": ["MTVA3ZD/A"] },

    { "model": "iPhone 16 Plus", "capacity": "128 Go", "color": "Noir",  "partNumber": ["MTVB3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "256 Go", "color": "Noir",  "partNumber": ["MTVC3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "512 Go", "color": "Noir",  "partNumber": ["MTVD3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "128 Go", "color": "Bleu",  "partNumber": ["MTVE3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "256 Go", "color": "Bleu",  "partNumber": ["MTVF3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "512 Go", "color": "Bleu",  "partNumber": ["MTVG3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "128 Go", "color": "Rose",  "partNumber": ["MTVH3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "256 Go", "color": "Rose",  "partNumber": ["MTVJ3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "512 Go", "color": "Rose",  "partNumber": ["MTVK3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "128 Go", "color": "Jaune", "partNumber": ["MTVL3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "256 Go", "color": "Jaune", "partNumber": ["MTVM3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "512 Go", "color": "Jaune", "partNumber": ["MTVN3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "128 Go", "color": "Vert",  "partNumber": ["MTVP3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "256 Go", "color": "Vert",  "partNumber": ["MTVQ3ZD/A"] },
    { "model": "iPhone 16 Plus", "capacity": "512 Go", "color": "Vert",  "partNumber": ["MTVR3ZD/A"] },

    { "model": "iPhone 16 Pro", "capacity": "128 Go", "color": "Titane noir", "partNumber": ["MYND3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "256 Go", "color": "Titane noir", "partNumber": ["MYNH3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "512 Go", "color": "Titane noir", "partNumber": ["MYNM3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "1 To",   "color": "Titane noir", "partNumber": ["MYNR3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "128 Go", "color": "Titane désert", "partNumber": ["MYNF3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "256 Go", "color": "Titane désert", "partNumber": ["MYNK3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "512 Go", "color": "Titane désert", "partNumber": ["MYNP3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "1 To",   "color": "Titane désert", "partNumber": ["MYNW3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "128 Go", "color": "Titane naturel", "partNumber": ["MYNG3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "256 Go", "color": "Titane naturel", "partNumber": ["MYNL3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "512 Go", "color": "Titane naturel", "partNumber": ["MYNQ3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "1 To",   "color": "Titane naturel", "partNumber": ["MYNX3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "128 Go", "color": "Titane blanc", "partNumber": ["MYNE3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "256 Go", "color": "Titane blanc", "partNumber": ["MYNJ3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "512 Go", "color": "Titane blanc", "partNumber": ["MYNN3ZD/A"] },
    { "model": "iPhone 16 Pro", "capacity": "1 To",   "color": "Titane blanc", "partNumber": ["MYNT3ZD/A"] },

    { "model": "iPhone 16 Pro Max", "capacity": "256 Go", "color": "Titane noir", "partNumber": ["MYWV3ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "512 Go", "color": "Titane noir", "partNumber": ["MYX03ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "1 To",   "color": "Titane noir", "partNumber": ["MYX43ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "256 Go", "color": "Titane désert", "partNumber": ["MYWX3ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "512 Go", "color": "Titane désert", "partNumber": ["MYX23ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "1 To",   "color": "Titane désert", "partNumber": ["MYX63ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "256 Go", "color": "Titane naturel", "partNumber": ["MYWY3ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "512 Go", "color": "Titane naturel", "partNumber": ["MYX33ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "1 To",   "color": "Titane naturel", "partNumber": ["MYX73ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "256 Go", "color": "Titane blanc", "partNumber": ["MYWW3ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "512 Go", "color": "Titane blanc", "partNumber": ["MYX13ZD/A"] },
    { "model": "iPhone 16 Pro Max", "capacity": "1 To",   "color": "Titane blanc", "partNumber": ["MYX53ZD/A"] }
  ]
}
EOF

# 2) Source Apple + normalisation (distances propres)
cat > src/sources/apple.js <<'EOF'
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
EOF

# 3) Service check → renvoie mode LIVE/MOCK + parts utilisées
cat > src/services/check.js <<'EOF'
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
EOF

# 4) Patch server.js : renvoyer mode + endpoint /api/_dev/test-sku
if ! grep -q "res.json({ ok: true, mode:" server.js 2>/dev/null; then
  perl -0777 -pe 's/const data = await checkAvailability\(\{([\s\S]*?)\}\);\s*res\.json\(\{ ok: true, results: data \}\);/const data = await checkAvailability({$1});\n  res.json({ ok: true, mode: data.mode, usedParts: data.parts, results: data.list });/g' -i server.js || true
fi

if ! grep -q "_dev/test-sku" server.js 2>/dev/null; then
cat >> server.js <<'EOF'

// DEV: tester un SKU brut (x-dev-token: DEV_TOKEN)
app.get("/api/_dev/test-sku", async (req,res)=>{
  if (!process.env.DEV_TOKEN || req.headers["x-dev-token"] !== process.env.DEV_TOKEN) return res.status(403).json({error:"Forbidden"});
  const { part, postal } = req.query;
  if (!part || !postal) return res.status(400).json({ error: "part et postal requis" });
  try {
    const raw = await (await import('./src/sources/apple.js')).then(m=>m.fetchPickupForParts({ parts:[String(part)], postal:String(postal) }));
    const norm = (await import('./src/sources/apple.js')).then(m=>m.normalizeFulfillment(raw));
    const n = await norm; res.json({ ok:true, results:n });
  } catch(e){ res.status(502).json({ ok:false, error:e.message }); }
});
EOF
fi

# 5) Dépendances (si manquantes)
npm pkg set type=module >/dev/null 2>&1 || true
npm i ioredis bullmq nodemailer dotenv --save >/dev/null

# 6) Vérification JSON rapide
node -e "JSON.parse(require('fs').readFileSync('data/apple_fr_skus.json','utf8'))" >/dev/null && echo "✅ JSON SKUs OK"

# 7) Commit & push si repo git
if git rev-parse --git-dir >/dev/null 2>&1; then
  git add data/apple_fr_skus.json src/sources/apple.js src/services/check.js server.js || true
  git commit -m "fix: live mode + distances + SKUs FR iPhone 16 range" || true
  git push || true
else
  echo "ℹ️  Pas de repo git ici (pas de .git). Skip commit/push."
fi

# 8) Relance locale
if pgrep -f "node server.js" >/dev/null 2>&1; then
  pkill -f "node server.js" || true
fi
echo "▶️  Lancement local…"
node server.js &
sleep 1
echo "✅ Serveur relancé. Test API health: curl http://localhost:${PORT:-3000}/api/health || true"
