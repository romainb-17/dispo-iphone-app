const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// -------- Static --------
function pickStaticDir() {
  const candidates = [process.env.STATIC_DIR, 'public', 'dist', 'build'].filter(Boolean);
  for (const dir of candidates) {
    try { if (fs.existsSync(path.join(process.cwd(), dir, 'index.html'))) return dir; } catch {}
  }
  return 'public';
}
const staticDir = path.join(process.cwd(), pickStaticDir());
console.log('👉 Serving from', staticDir);
app.use((_,res,next)=>{ res.set('Cache-Control','no-store'); next(); });
app.use(express.json());
app.use(express.static(staticDir, { etag:false, lastModified:false, cacheControl:false, maxAge:0 }));

app.get('/healthz', (_req,res)=>res.status(200).send('ok'));

// -------- Apple availability helper (non-officiel) --------
async function getAvailability({ country='fr', location='', store='', skus=[] }){
  country = String(country).toLowerCase();
  if(!Array.isArray(skus)) skus = String(skus||'').split(',').map(s=>s.trim()).filter(Boolean);

  const base = `https://www.apple.com/${country}/shop/fulfillment-messages`;
  const qs = new URLSearchParams({ pl:'true', 'mts.0':'regular', searchNearby:'true' });
  skus.forEach((sku,i)=>qs.set(`parts.${i}`, sku));
  if (store) qs.set('store', store);
  if (location) qs.set('location', location);

  const r = await fetch(`${base}?${qs.toString()}`, {
    headers: { 'accept':'application/json, text/plain, */*', 'cache-control':'no-cache', 'user-agent':'Mozilla/5.0 dispo-iphone-app' }
  });
  if(!r.ok){
    const body = await r.text().catch(()=> '');
    throw new Error(`apple_upstream_${r.status}:${body.slice(0,200)}`);
  }
  const payload = await r.json();
  const stores = payload?.body?.content?.pickupMessage?.stores || [];
  return stores.map(st=>{
    const parts = st?.partsAvailability || {};
    return {
      storeName: st.storeName || st.address?.addressLine1 || 'Apple Store',
      city: st.city || st.address?.city || '',
      storeNumber: st.storeNumber || st.retailStoreNumber || st.storeId || '',
      distanceWithUnit: st.distanceWithUnit || st.storeDistanceWithUnit || '',
      availability: skus.map(sku=>{
        const p = parts[sku];
        return p ? { sku, pickupDisplay:p.pickupDisplay, storePickupQuote:p.storePickupQuote || p.pickupSearchQuote || '' }
                 : { sku, pickupDisplay:'unknown', storePickupQuote:'' };
      })
    };
  });
}

// -------- API: disponibilité directe --------
app.get('/api/availability', async (req, res) => {
  try{
    const country=(req.query.country||'fr').toString();
    const location=(req.query.location||'').toString();
    const store=(req.query.store||'').toString();
    const skus=(req.query.skus||'').toString().split(',').map(s=>s.trim()).filter(Boolean);
    if(!skus.length) return res.status(400).json({ ok:false, error:'missing_skus' });
    if(!location && !store) return res.status(400).json({ ok:false, error:'missing_location_or_store' });
    const results = await getAvailability({ country, location, store, skus });
    res.json({ ok:true, count: results.length, results });
  }catch(e){ res.status(500).json({ ok:false, error:String(e.message||e) }); }
});

// -------- Event log (50 derniers) + poller chaque minute --------
const EVENTS=[]; const MAX_EVENTS=50; const LAST=new Map();
function pushEvent(ev){ EVENTS.push(ev); if(EVENTS.length>MAX_EVENTS) EVENTS.splice(0,EVENTS.length-MAX_EVENTS); }

let monitorCfg=null;
try { monitorCfg = JSON.parse(fs.readFileSync(path.join(process.cwd(),'monitor.config.json'),'utf8')); } catch { monitorCfg=null; }

async function pollOnce(){
  if(!monitorCfg?.monitors?.length) return;
  for(const m of monitorCfg.monitors){
    try{
      const results = await getAvailability(m);
      for(const st of results){
        for(const p of st.availability||[]){
          const cur = (p.pickupDisplay==='available') ? 'available' : 'unavailable';
          const key = `${st.storeNumber||st.storeName}::${p.sku}`;
          const prev = LAST.has(key)?LAST.get(key):null;
          if(prev===null){ LAST.set(key, cur); continue; }
          if(prev!==cur){
            LAST.set(key, cur);
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
              to: cur,
              quote: p.storePickupQuote||'',
              distance: st.distanceWithUnit||''
            });
            console.log(`🔔 ${st.storeName} ${st.city} · ${p.sku} : ${prev} → ${cur}`);
          }
        }
      }
    }catch(e){ console.warn('poll error', e?.message||e); }
  }
}

if(monitorCfg?.monitors?.length){
  const every = Math.max(1, Number(monitorCfg.everyMinutes||1));
  console.log(`⏱️ Monitor actif — toutes les ${every} min`);
  pollOnce().catch(()=>{});
  setInterval(pollOnce, every*60*1000);
} else {
  console.log('ℹ️ Monitor inactif (pas de monitor.config.json valide).');
}

app.get('/api/events', (req,res)=>{
  const limit=Math.min(parseInt(req.query.limit||'50',10)||50,200);
  res.json({ ok:true, events: EVENTS.slice(-limit).reverse() });
});

// -------- Fallback SPA --------
app.get('*', (req,res,next)=>{
  if(req.method!=='GET') return next();
  res.sendFile(path.join(staticDir,'index.html'), err=> err && next(err));
});

app.listen(PORT, ()=>console.log(`✅ Listening on :${PORT}`));
