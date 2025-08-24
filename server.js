const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

function pickStaticDir() {
  const candidates = [process.env.STATIC_DIR, 'dist', 'build', 'public'].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(process.cwd(), dir, 'index.html'))) return dir;
  }
  return 'public';
}
const chosen = pickStaticDir();
const staticDir = path.join(process.cwd(), chosen);
console.log('👉 Serving from', staticDir);

app.use(express.json());
app.use(express.static(staticDir));

// Health
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Données réelles Apple (non officiel): fulfillment-messages
app.get('/api/availability', async (req, res) => {
  try {
    const country = (req.query.country || 'fr').toString().toLowerCase();
    const location = (req.query.location || '').toString();   // CP/ville ou lat,long
    const store    = (req.query.store || '').toString();      // Rxxx optionnel
    const skus = (req.query.skus || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
    if (!skus.length) return res.status(400).json({ error: 'missing skus' });
    if (!location && !store) return res.status(400).json({ error: 'missing location or store' });

    const base = `https://www.apple.com/${country}/shop/fulfillment-messages`;
    const qs = new URLSearchParams({ pl:'true', 'mts.0':'regular', searchNearby:'true' });
    skus.forEach((sku,i)=>qs.set(`parts.${i}`, sku));
    if (store) qs.set('store', store);
    if (location) qs.set('location', location);
    const url = `${base}?${qs.toString()}`;

    const r = await fetch(url, { headers: { 'accept':'application/json', 'cache-control':'no-cache', 'user-agent':'Mozilla/5.0 radardispo' }});
    if (!r.ok) return res.status(502).json({ error:'apple_upstream', status:r.status, body: (await r.text()).slice(0,300) });
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
          return p ? { sku, pickupDisplay: p.pickupDisplay, storePickupQuote: p.storePickupQuote || p.pickupSearchQuote || '' }
                   : { sku, pickupDisplay:'unknown' };
        })
      };
    });
    res.json({ ok:true, count: results.length, results });
  } catch (e) {
    res.status(500).json({ error:'server_error', details: String(e?.message||e) });
  }
});

// Fallback SPA
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(staticDir, 'index.html'), err => err && next(err));
});

app.listen(PORT, () => console.log(`✅ Listening on :${PORT}`));
