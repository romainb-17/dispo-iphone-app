import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const DB_FILE=path.join(__dirname,'../../data/subscriptions.json');
async function ensureFile(){ try { await fs.mkdir(path.dirname(DB_FILE), { recursive: true }); await fs.access(DB_FILE); } catch { await fs.writeFile(DB_FILE, JSON.stringify({ items: [] }, null, 2), 'utf-8'); } }
export async function listSubscriptions(){ await ensureFile(); const raw=await fs.readFile(DB_FILE,'utf-8'); const data=JSON.parse(raw||'{"items":[]}'); return data.items||[]; }
export async function saveSubscriptions(items){ await ensureFile(); await fs.writeFile(DB_FILE, JSON.stringify({ items }, null, 2), 'utf-8'); }
export async function subscribe(payload){
  await ensureFile();
  const all=await listSubscriptions();
  const id=crypto.randomUUID();
  const now=new Date().toISOString();
  const rec={ id, email:payload.email, model:payload.model, capacity:payload.capacity, color:payload.color, postal:payload.postal, operator:payload.operator||'', createdAt:now, lastNotifiedAt:null, active:true };
  all.push(rec); await saveSubscriptions(all); return rec;
}
