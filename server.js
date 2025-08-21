import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { getModels } from './src/models.js';
import { checkAvailability } from './src/services/check.js';
import { subscribe, listSubscriptions } from './src/services/subscriptions.js';
import { startWorker } from './src/services/worker.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.CORS_ORIGIN || '*';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '200kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT || '60', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));
app.get('/api/models', (_req, res) => res.json(getModels()));
app.get('/api/check', async (req, res) => {
  const { model, capacity, color, postal, operator, onlyAvailable } = req.query;
  if (!model || !capacity || !color || !postal) return res.status(400).json({ error: 'Missing required parameters' });
  try {
    const onlyOk = String(onlyAvailable || '') === 'true';
    const data = await checkAvailability({ model, capacity, color, postal, operator, onlyAvailable: onlyOk });
  res.json({ ok: true, mode: data.mode, usedParts: data.parts, results: data.list });
  } catch (e) {
    console.error(e);
    res.status(502).json({ ok: false, error: 'Upstream error' });
  }
});
app.post('/api/subscribe', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.email) return res.status(400).json({ error: 'Email requis' });
    const saved = await subscribe(payload);
    res.json({ ok: true, subscription: saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
app.get('/api/_debug/subscriptions', async (_req, res) => res.json(await listSubscriptions()));

// DEV ONLY: ajout SKU (protégé par DEV_TOKEN)
app.post('/api/_dev/add-sku', (req, res) => {
  if (!process.env.DEV_TOKEN || req.headers['x-dev-token'] !== process.env.DEV_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { model, capacity, color, partNumber } = req.body || {};
  if (!model || !capacity || !color || !partNumber) return res.status(400).json({ error: 'Paramètres manquants' });
  const file = path.join(__dirname, 'data', 'apple_fr_skus.json');
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(raw || '{"products":[]}');
    const products = json.products || [];
    const idx = products.findIndex(p => p.model===model && p.capacity===capacity && p.color===color);
    if (idx === -1) { products.push({ model, capacity, color, partNumber }); }
    else {
      const rec = products[idx];
      if (Array.isArray(rec.partNumber)) { if (!rec.partNumber.includes(partNumber)) rec.partNumber.push(partNumber); }
      else { rec.partNumber = Array.from(new Set([rec.partNumber, partNumber].filter(Boolean))); }
    }
    json.products = products;
    fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Erreur écriture' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ Dispo iPhone server listening on http://localhost:${PORT}`);
  startWorker();
});

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
