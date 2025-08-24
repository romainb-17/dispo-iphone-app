const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ On fige sur public/ pour éviter toute vieille build "dist"
const staticDir = path.join(process.cwd(), 'public');
console.log('👉 Serving ONLY from', staticDir);

app.use((req,res,next)=>{ res.set('Cache-Control','no-store'); next(); });
app.use(express.json());
app.use(express.static(staticDir, { etag:false, cacheControl:false }));

app.get('/healthz', (_req,res)=>res.status(200).send('ok'));
app.get('/__debug', (_req,res)=>{
  res.json({
    staticDir,
    has_public_index: fs.existsSync(path.join(staticDir,'index.html')),
    node: process.version,
    now: new Date().toISOString()
  });
});

// Proxy Apple (non officiel) → /api/availability
app.get('/api/availability', async (req, res) => {
  try {
    const country  = (req.query.country  || 'fr').toString().toLowerCase();
    const location = (req.query.location || '').toString();
    const store    = (req.query.store    || '').toString();
    const skus = (req.query.skus || '').toString().split(',').map(s=>s.trim()).filter(Boolean);

    if (!skus.length) return res.status(400).json({ ok:false, error:'missing_skus' });
    if (!location && !store) return res.status(400).json({ ok:false, error:'missing_location_or_store' });

    const base = `https://www.apple.com/${country}/shop/fulfillment-messages`;
    const qs = new URLSearchParams({ pl:'true', 'mts.0':'regular', searchNearby:'true' });
    skus.forEach((sku,i)=>qs.set(`parts.${i}`, sku));
    if (store) qs.set('store', store);
    if (location) qs.set('location', location);
    const url = `${base}?${qs.toString()}`;

    const r = await fetch(url, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'cache-control': 'no-cache',
        'user-agent': 'Mozilla/5.0 dispo-iphone-app'
      }
    });

    if (!r.ok) {
      const text = await r.text().catch(()=> '');
      return res.status(502).json({ ok:false, error:'apple_upstream', status:r.status, body:text.slice(0,400) });
    }

    const payload = await r.json();
    const stores = payload?.body?.content?.pickupMessage?.stores || [];

    const results = stores.map(st => {
      const parts = st?.partsAvailability || {};
      return {
        storeName: st.storeName || st.address?.addressLine1 || 'Apple Store',
        city: st.city || st.address?.city || '',
        storeNumber: st.storeNumber || st.retailStoreNumber || st.storeId || '',
        distanceWithUnit: st.distanceWithUnit || st.storeDistanceWithUnit || '',
        availability: skus.map(sku => {
          const p = parts[sku];
          return p ? { sku, pickupDisplay:p.pickupDisplay, storePickupQuote:p.storePickupQuote || p.pickupSearchQuote || '' }
                   : { sku, pickupDisplay:'unknown' };
        })
      };
    });

    res.json({ ok:true, count: results.length, results });
  } catch (e) {
    res.status(500).json({ ok:false, error:'server_error', details:String(e?.message||e) });
  }
});

// Fallback SPA → public/index.html
app.get('*', (req,res,next)=>{
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(staticDir,'index.html'), err => err && next(err));
});

app.listen(PORT, ()=>console.log(`✅ Listening on :${PORT}`));
