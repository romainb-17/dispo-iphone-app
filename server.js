import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { getModels } from './src/models.js';
import { checkAvailability } from './src/services/check.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '200kb' }));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT || '60', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/api/health', (_req, res)=> res.json({ ok:true, now:new Date().toISOString() }));
app.get('/api/models', (_req, res)=> res.json(getModels()));
app.get('/api/check', async (req, res) => {
  const { model, capacity, color, postal, onlyAvailable } = req.query;
  if (!model || !capacity || !color || !postal) return res.status(400).json({ error:'Missing required parameters' });
  const onlyOk = String(onlyAvailable || '') === 'true';
  const data = await checkAvailability({ model, capacity, color, postal, onlyAvailable: onlyOk });
  res.json({ ok:true, results:data });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, ()=> console.log(`✅ Dispo iPhone en local: http://localhost:${PORT}`));
