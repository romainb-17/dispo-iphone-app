#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
const FILE = path.join(__dirname, '..', 'data', 'apple_fr_skus.json');
function load(){ try{ return JSON.parse(fs.readFileSync(FILE,'utf-8')); } catch { return { meta:{country:'fr'}, products: [] }; } }
function save(json){ fs.writeFileSync(FILE, JSON.stringify(json, null, 2), 'utf-8'); }
function usage(){ console.log('Usage: node tools/add_sku.js "iPhone 16 Pro" "256 Go" "Titane naturel" "MTXXXXZD/A"'); process.exit(1); }
const [,, model, capacity, color, part] = process.argv;
if(!model || !capacity || !color || !part) usage();
const db = load(); db.products = db.products || [];
const idx = db.products.findIndex(p => p.model===model && p.capacity===capacity && p.color===color);
if (idx === -1) db.products.push({ model, capacity, color, partNumber: part });
else {
  const rec = db.products[idx];
  if (Array.isArray(rec.partNumber)) { if (!rec.partNumber.includes(part)) rec.partNumber.push(part); }
  else { rec.partNumber = Array.from(new Set([rec.partNumber, part].filter(Boolean))); }
}
save(db); console.log('✓ Ajouté:', `${model} | ${capacity} | ${color}`, '→', part);
