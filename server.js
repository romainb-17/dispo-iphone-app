const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// -------- Static dir (public/dist/build) --------
function pickStaticDir() {
  const candidates = [process.env.STATIC_DIR, 'dist', 'build', 'public'].filter(Boolean);
  for (const dir of candidates) {
    try { if (fs.existsSync(path.join(process.cwd(), dir, 'index.html'))) return dir; } catch {}
  }
  return 'public';
}
const staticDir = path.join(process.cwd(), pickStaticDir());
console.log('👉 Serving from', staticDir);

app.use((req,res,next)=>{ res.set('Cache-Control','no-store'); next(); });
app.use(express.json());
app.use(express.static(staticDir, { etag:false, cacheControl:false, lastModified:false, maxAge:0 }));

app.get('/healthz', (_req,res)=>res.status(200).send('ok'));

// -------- Helper: fetch Apple availability (non officiel) --------
async function getAvailability({ country='fr', location='', store='', skus=[] }){
  country = String(country).toLowerCase();
  const base = `https://www.apple.com/${country}/shop/fulfillment-messages`;
  const qs = new URLSearchParams({ pl:'true', 'mts.0':'regular', searchNearby:'true' });
  if (!Array.isArray(skus)) skus = String(skus||'').split(',').map(s=>s.trim()).filter(Boolean);
  skus.forEach((sku,i)=>qs.set(`parts.${i}`, sku));
  if (store) qs.set('store', store);
  if (location) qs.set('location', location);

  const url = `${base}?${qs.toString()}`;
  const r = await fetch(url, { headers: {
    'accept': 'application/json, text/plain, */*',
    'cache-control': 'no-cache',
    'user-agent': 'Mozilla/5.0 dispo-iphone-app'
  }});
  if (!r.ok) {
    const body = await r.text().catch(()=> '');
    throw new Error(`apple_upstream_${r.status}:${body.slice(0,200)}`);
  }
  const payload = await r.json();
  const stores = payload?.body?.content?.pickupMessage?.stores || [];
  // Normalisation (même forme que /api/availability)
  return stores.map(st=>{
    const parts = st?.partsAvailability || {};
    return {
      storeName: st.storeName || st.address?.addressLine1 || 'Apple Store',
      city: st.city || st.address?.city || '',
      storeNumber: st.storeNumber || st.retailStoreNumber || st.storeId || '',
      distanceWithUnit: st.distanceWithUnit || st.storeDistanceWithUnit || '',
      availability: skus.map(sku=>{
        const p = parts[sku];
        return p ? { sku, pickupDisplay: p.pickupDisplay, storePickupQuote: p.storePickupQuote || p.pickupSearchQuote || '' }
                 : { sku, pickupDisplay: 'unknown', storePickupQuote: '' };
      })
    };
  });
}

// -------- API publique /api/availability --------
app.get('/api/availability', async (req, res) => {
  try{
    const country = (req.query.country||'fr').toString();
    const location = (req.query.location||'').toString();
    const store = (req.query.store||'').toString();
    const skus = (req.query.skus||'').toString().split(',').map(s=>s.trim()).filter(Boolean);
    if(!skus.length) return res.status(400).json({ ok:false, error:'missing_skus' });
    if(!location && !store) return res.status(400).json({ ok:false, error:'missing_location_or_store' });
    const results = await getAvailability({ country, location, store, skus });
    res.json({ ok:true, count: results.length, results });
  }catch(e){
    res.status(500).json({ ok:false, error:String(e.message||e) });
  }
});

// -------- Event log (last 50) + poller chaque minute --------
const EVENTS = [];                  // ring buffer d'événements (ordre ancien → récent)
const MAX_EVENTS = 50;
const LAST = new Map();             // key: storeNumber|storeName + sku → 'available'|'unavailable'|'unknown'

function pushEvent(ev){
  EVENTS.push(ev);
  if (EVENTS.length > MAX_EVENTS) EVENTS.splice(0, EVENTS.length - MAX_EVENTS);
}

// Charge config
let monitorCfg = null;
try { monitorCfg = JSON.parse(fs.readFileSync(path.join(process.cwd(),'monitor.config.json'),'utf8')); }
catch { monitorCfg = null; }

async function pollOnce(){
  if(!monitorCfg?.monitors?.length) return;
  for(const m of monitorCfg.monitors){
    try{
      const results = await getAvailability(m);
      for(const st of results){
        for(const p of st.availability||[]){
          const norm = (p.pickupDisplay==='available') ? 'available' : 'unavailable';
          const key = `${st.storeNumber||st.storeName}::${p.sku}`;
          const prev = LAST.has(key) ? LAST.get(key) : null;
          if(prev===null){
            // première mesure → on initialise sans créer d'event
            LAST.set(key, norm);
          }else if(prev !== norm){
            LAST.set(key, norm);
            pushEvent({
              ts: new Date().toISOString(),
              country: m.country||'fr',
              location: m.location||'',
              store: m.store||'',
              storeNumber: st.storeNumber,
              storeName: st.storeName,
              city: st.city,
              sku: p.sku,
              from: prev,
              to: norm,
              quote: p.storePickupQuote||'',
              distance: st.distanceWithUnit||''
            });
            console.log(`🔔 ${st.storeName} ${st.city} · ${p.sku} : ${prev} → ${norm}`);
          }
        }
      }
    }catch(e){
      console.warn('poll error', (e&&e.message)||e);
    }
  }
}

// Démarrage poller
if(monitorCfg?.monitors?.length){
  const every = Math.max(1, Number(monitorCfg.everyMinutes||1));
  console.log(`⏱️  Monitor actif: ${monitorCfg.monitors.length} cible(s) — toutes les ${every} min`);
  // premier tick immédiat, puis intervalle
  pollOnce().catch(()=>{});
  setInterval(pollOnce, every*60*1000);
}else{
  console.log('ℹ️ Monitor inactif (aucune monitor.config.json ou moniteurs vides).');
}

// API pour consulter les événements
app.get('/api/events', (req,res)=>{
  const limit = Math.min(parseInt(req.query.limit||'50',10)||50, 200);
  const slice = EVENTS.slice(-limit).reverse(); // renvoie les plus récents d'abord
  res.json({ ok:true, events: slice });
});

// -------- Fallback SPA --------
app.get('*', (req,res,next)=>{
  if (req.method!=='GET') return next();
  res.sendFile(path.join(staticDir,'index.html'), err=> err && next(err));
});

app.listen(PORT, ()=>console.log(`✅ Listening on :${PORT}`));
