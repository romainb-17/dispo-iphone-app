const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- config tunable via env
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 5); // appels Apple en // 
const CHUNK_SKUS      = Number(process.env.CHUNK_SKUS || 15);     // nb de SKUs par requête Apple
const COOLDOWN_HOURS  = Number(process.env.COOLDOWN_HOURS || 6);  // anti-spam email
const JITTER_MS       = Number(process.env.JITTER_MS || 300);     // petite pause entre requêtes
const FROM = process.env.FROM_EMAIL || process.env.GMAIL_USER;

// ---- static dir auto
function pickStaticDir(){
  const c=[process.env.STATIC_DIR,'dist','build','public'].filter(Boolean);
  for(const d of c){ if(fs.existsSync(path.join(process.cwd(),d,'index.html'))) return d; }
  return 'public';
}
const staticDir = path.join(process.cwd(), pickStaticDir());
console.log('👉 Serving from', staticDir);

app.use(express.json());
app.use(express.static(staticDir));
app.get('/healthz', (req,res)=>res.status(200).send('ok'));

// ========= Apple API helpers =========
const delay = (ms)=>new Promise(r=>setTimeout(r, ms));
async function fetchWithRetry(url, opt={}, tries=3){
  for(let i=0;i<tries;i++){
    const r = await fetch(url, opt);
    if(r.ok) return r;
    const retriable = [429,502,503,504].includes(r.status);
    if(!retriable || i===tries-1) return r;
    await delay(500*(i+1) + Math.random()*500);
  }
}

async function appleAvailability({ country='fr', location='', store='', skus=[] }){
  if(!Array.isArray(skus)) skus = String(skus).split(',').map(s=>s.trim()).filter(Boolean);
  const base = `https://www.apple.com/${country}/shop/fulfillment-messages`;
  const qs = new URLSearchParams({ pl:'true','mts.0':'regular',searchNearby:'true' });
  skus.forEach((sku,i)=>qs.set(`parts.${i}`, sku));
  if(store) qs.set('store', store);
  if(location) qs.set('location', location);
  const url = `${base}?${qs.toString()}`;
  const r = await fetchWithRetry(url, { headers:{
    'accept':'application/json','cache-control':'no-cache',
    'user-agent':'Mozilla/5.0 dispo-iphone-app/alerts'
  }});
  if(!r || !r.ok){
    const txt = r ? await r.text().catch(()=>'' ) : '';
    throw new Error(`apple_upstream ${r?.status||'nores'} ${txt.slice(0,160)}`);
  }
  const data = await r.json();
  return data?.body?.content?.pickupMessage?.stores || [];
}

app.get('/api/availability', async (req,res)=>{
  try{
    const country=(req.query.country||'fr').toString().toLowerCase();
    const location=(req.query.location||'').toString();
    const store=(req.query.store||'').toString();
    const skus=(req.query.skus||'').toString().split(',').map(s=>s.trim()).filter(Boolean);
    if(!skus.length) return res.status(400).json({error:'missing skus'});
    if(!location && !store) return res.status(400).json({error:'missing location or store'});
    const stores = await appleAvailability({ country, location, store, skus });
    const results = normalizeResults(stores, skus);
    res.json({ ok:true, count: results.length, results });
  }catch(e){ res.status(502).json({ error:String(e.message||e) }); }
});

function normalizeResults(stores, skus){
  return (stores||[]).map(st=>{
    const parts = st?.partsAvailability||{};
    return {
      storeName: st.storeName || st.address?.addressLine1 || 'Apple Store',
      city: st.city || st.address?.city || '',
      storeNumber: st.storeNumber || st.retailStoreNumber || st.storeId || '',
      distanceWithUnit: st.distanceWithUnit || st.storeDistanceWithUnit || '',
      availability: skus.map(sku=>{
        const p = parts[sku];
        return p ? { sku, pickupDisplay:p.pickupDisplay, storePickupQuote:p.storePickupQuote || p.pickupSearchQuote || '' }
                 : { sku, pickupDisplay:'unknown' };
      })
    };
  });
}

// ========= Tiny JSON DB =========
const DB_PATH = process.env.DB_PATH || '/data/alerts.json';
function ensureDir(p){ try{ fs.mkdirSync(path.dirname(p),{recursive:true}); }catch{} }
function loadDB(){ try{ return JSON.parse(fs.readFileSync(DB_PATH,'utf8')); }catch{ return { subs:[] }; } }
function saveDB(db){ ensureDir(DB_PATH); fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }
function uuid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2); }

// ========= Email (Gmail SMTP via Nodemailer, pool + rateLimit) =========
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  pool: true,
  maxConnections: Number(process.env.SMTP_MAX_CONN || 3),
  maxMessages: Infinity,
  rateDelta: Number(process.env.SMTP_RATE_MS || 1000), // fenêtre
  rateLimit: Number(process.env.SMTP_RATE_COUNT || 5)  // messages max par fenêtre
});

// ========= Abonnements =========
app.post('/alerts',(req,res)=>{
  const { email, sku, country='fr', location='', store='' } = req.body||{};
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error:'email invalide' });
  if(!sku) return res.status(400).json({ error:'sku manquant' });
  if(!location && !store) return res.status(400).json({ error:'location ou store requis' });
  const db=loadDB();
  const exists = db.subs.find(s=> s.email===email && s.sku===sku && s.location===location && s.store===store && s.country===country);
  if(exists) return res.json({ ok:true, id: exists.id, dedup:true });
  const sub = { id: uuid(), email, sku, country, location, store, createdAt: Date.now(), lastNotifiedAt: 0 };
  db.subs.push(sub); saveDB(db);
  res.json({ ok:true, id: sub.id });
});
app.get('/alerts',(req,res)=>{ const db=loadDB(); res.json({ ok:true, count: db.subs.length, subs: db.subs }); });
app.delete('/alerts/:id',(req,res)=>{ const db=loadDB(); const n=db.subs.length; db.subs=db.subs.filter(s=>s.id!==req.params.id); saveDB(db); res.json({ ok:true, removed: n-db.subs.length }); });

// ========= Cron scalable =========
function groupSubs(subs){
  const map = new Map();
  for(const s of subs){
    const key = JSON.stringify({ country:(s.country||'fr').toLowerCase(), store:s.store||'', location:s.location||'' });
    if(!map.has(key)) map.set(key, { ...JSON.parse(key), skus:new Set(), subs:[] });
    const g = map.get(key); g.skus.add(s.sku); g.subs.push(s);
  }
  return [...map.values()];
}

async function runWithLimit(tasks, limit){
  const q = tasks.slice(); const workers=[];
  const worker = async ()=>{ while(q.length){ const fn=q.shift(); await fn(); } };
  for(let i=0;i<Math.min(limit, tasks.length);i++) workers.push(worker());
  await Promise.all(workers);
}

app.get('/cron/check', async (req,res)=>{
  if(!process.env.CRON_SECRET || req.query.secret !== process.env.CRON_SECRET) return res.status(401).json({ error:'unauthorized' });
  const db = loadDB();
  const groups = groupSubs(db.subs);
  let appleCalls=0, notified=0, checked=0, errors=0, cooled=0;

  const tasks = groups.map(g => async ()=>{
    // découpe SKUs en paquets
    const skuList = [...g.skus];
    const chunks = []; for(let i=0;i<skuList.length;i+=CHUNK_SKUS) chunks.push(skuList.slice(i,i+CHUNK_SKUS));
    // récup disponibilités agrégées
    const avail = new Map(); // sku => boolean available somewhere
    for(const chunk of chunks){
      try{
        await delay(Math.floor(Math.random()*JITTER_MS));
        appleCalls++;
        const stores = await appleAvailability({ country:g.country, location:g.location, store:g.store, skus:chunk });
        const results = normalizeResults(stores, chunk);
        for(const row of results){
          for(const p of row.availability){
            if(p.pickupDisplay==='available') avail.set(p.sku, true);
          }
        }
      }catch(e){ errors++; }
    }
    // notifications
    for(const sub of g.subs){
      checked++;
      const ok = avail.get(sub.sku) === true;
      const cdMs = COOLDOWN_HOURS*60*60*1000;
      if(ok){
        if(sub.lastNotifiedAt && (Date.now()-sub.lastNotifiedAt)<cdMs){ cooled++; continue; }
        try{
          await transporter.sendMail({
            from: FROM, to: sub.email,
            subject: `✅ Dispo iPhone ${sub.sku} près de ${sub.store||g.location||g.country}`,
            text: `Le SKU ${sub.sku} est signalé disponible pour retrait Apple Store près de ${sub.store||g.location||g.country}.\n\n(Ces alertes sont limitées à 1 toutes ${COOLDOWN_HOURS}h par abonnement.)`
          });
          sub.lastNotifiedAt = Date.now(); notified++;
        }catch(e){ errors++; }
      }
    }
  });

  await runWithLimit(tasks, MAX_CONCURRENCY);
  saveDB(db);
  res.json({ ok:true, stats:{ groups:groups.length, appleCalls, checked, notified, cooled, errors } });
});

// ========= SPA fallback =========
app.get('*',(req,res,next)=>{ if(req.method!=='GET')return next(); res.sendFile(path.join(staticDir,'index.html'),err=>err&&next(err)); });

app.listen(PORT,()=>console.log(`✅ Listening on :${PORT}`));
