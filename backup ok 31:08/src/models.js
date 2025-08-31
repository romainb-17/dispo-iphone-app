import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../..', 'data', 'apple_fr_skus.json');
function loadSKUs(){ try { return JSON.parse(fs.readFileSync(DATA_FILE,'utf-8')).products||[]; } catch { return []; } }
export function getModels(){
  const products = loadSKUs();
  const models = [...new Set(products.map(p=>p.model))];
  const capacities = [...new Set(products.map(p=>p.capacity))];
  const colors = [...new Set(products.map(p=>p.color))];
  const operators = ['Débloqué','Orange','SFR','Bouygues','Free'];
  const map = {};
  for(const p of products){
    const key = `${p.model}||${p.capacity}||${p.color}`;
    const parts = Array.isArray(p.partNumber) ? p.partNumber : (p.partNumber ? [p.partNumber] : []);
    if(!map[key]) map[key]=[];
    map[key].push(...parts);
  }
  return { models, capacities, colors, operators, partsMap: map };
}
