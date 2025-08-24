import { chromium } from 'playwright';
import fs from 'fs';

const REGION = process.env.REGION || 'fr';
const SUFFIX = process.env.SUFFIX || 'ZD/A';
const OUT    = process.env.OUT    || 'public/skus-fr.json';

const BUY = [
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-pro`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-pro-max`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-plus`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-se`
];

const PART_RE = new RegExp(String.raw`([A-Z0-9]{4,}\/?[A-Z0-9]*${SUFFIX.replace('/','\\/')})`);

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function normalizeCapacity(txt=''){
  // Convertit "256 Go" → "256", "1 To" → "1024"
  const t = txt.replace(/\s+/g,' ').trim();
  const mGo = t.match(/(\d{2,4})\s*(?:Go|GB)\b/i);
  if(mGo) return mGo[1];
  if(/\b1\s*(?:To|TB)\b/i.test(t)) return '1024';
  return t;
}

async function harvest(page, url){
  const found = []; // { sku, color, capacity }
  let modelName = 'iPhone';

  // Détecte le modèle
  try{
    await page.goto(url, { waitUntil:'domcontentloaded', timeout:45000 });
    await page.waitForLoadState('networkidle', { timeout:15000 }).catch(()=>{});
    const h1 = page.locator('h1').first();
    if(await h1.count()) modelName = (await h1.innerText()).replace(/^Acheter\s*/i,'').trim();
  }catch{}

  // Snapshot des sélections visibles (couleur / capacité)
  const snapshot = async () => page.evaluate(()=>{
    const pick = (labels)=> {
      const sections = Array.from(document.querySelectorAll('section, fieldset, div'));
      for(const s of sections){
        const txt = (s.innerText||'').toLowerCase();
        if(labels.some(l=>txt.includes(l))){
          const sel = s.querySelector('[aria-checked="true"],[aria-pressed="true"],input[type=radio][checked],[role=radio][aria-checked="true"],.is-selected,[data-selected="true"]');
          if(sel){
            return (sel.getAttribute('aria-label') || sel.textContent || '').trim();
          }
        }
      }
      return null;
    };
    return {
      color: pick(['couleur','coloris','finition','color']),
      capacity: pick(['capacité','stockage','capacity','go','gb','to','tb'])
    };
  });

  // Intercepte les requêtes Apple contenant parts.X
  page.on('request', async req=>{
    const u = req.url();
    if(!u.includes('fulfillment-messages') || !u.includes('parts.')) return;
    try{
      const q = new URL(u).searchParams;
      for(const [k,v] of q){
        if(!k.startsWith('parts.')) continue;
        if(PART_RE.test(v)){
          const s = await snapshot();
          found.push({ sku: v.trim(), color: s.color || null, capacity: s.capacity || null });
        }
      }
    }catch{}
  });

  // Clique toutes les options (groupes radio) pour déclencher toutes les variantes
  const groups = await page.locator('[role="radiogroup"]').all().catch(()=>[]);
  for(const g of groups){
    const radios = await g.locator('[role="radio"]').all();
    for(const r of radios){
      try{ await r.click({ timeout:4000 }); await page.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{}); await sleep(120); }catch{}
    }
  }
  // Dernier scroll pour XHR paresseux
  await page.mouse.wheel(0,1500).catch(()=>{}); await sleep(300);

  // Regroupe par couleur/capacité
  const map = {};
  for(const row of found){
    if(!row.sku.endsWith(SUFFIX)) continue;
    const color = (row.color||'Couleur').replace(/\s+/g,' ').trim();
    const cap = normalizeCapacity(row.capacity||'');
    map[color] ??= {};
    if(cap) map[color][cap] = row.sku;
  }
  return { model: modelName, map };
}

(async ()=>{
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext({ locale:'fr-FR' });
  const page = await ctx.newPage();

  const out = {}; // modèle → couleur → capacité → SKU
  for(const url of BUY){
    try{
      const { model, map } = await harvest(page, url);
      if(!Object.keys(map).length) { console.log('…aucun SKU pour', url); continue; }
      out[model] = Object.assign(out[model]||{}, map);
      console.log(`✓ ${model}: ${Object.values(map).reduce((a,b)=>a+Object.keys(b).length,0)} variantes`);
    }catch(e){
      console.warn('! Skip', url, e?.message||e);
    }
  }

  fs.mkdirSync('public', { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`✅ Écrit ${OUT}`);
  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
