import { chromium } from 'playwright';
import fs from 'fs';

const REGION = process.env.REGION || 'fr';
const SUFFIX = process.env.SUFFIX || 'ZD/A';
const OUT    = process.env.OUT    || 'public/skus-fr.json';

// Pages d'achat iPhone 16 (FR)
const BUY = [
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-pro`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-pro-max`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16`,
  `https://www.apple.com/${REGION}/shop/buy-iphone/iphone-16-plus`
];

const PART_RE = new RegExp(String.raw`([A-Z0-9]{4,}\/?[A-Z0-9]*${SUFFIX.replace('/','\\/')})`);
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function normCap(txt=''){
  const t = txt.replace(/\s+/g,' ').trim();
  const mGo = t.match(/(\d{2,4})\s*(?:Go|GB)\b/i);
  if(mGo) return mGo[1];                 // "256 Go" -> "256"
  if(/\b1\s*(?:To|TB)\b/i.test(t)) return '1024'; // "1 To" -> "1024"
  return t || '';
}

async function snapshotSelected(page){
  return page.evaluate(()=>{
    const pick = (keys)=>{
      const nodes=[...document.querySelectorAll('section,fieldset,div')];
      for(const n of nodes){
        const txt=(n.innerText||'').toLowerCase();
        if(keys.some(k=>txt.includes(k))){
          const sel=n.querySelector('[aria-checked="true"],[aria-pressed="true"],input[type=radio][checked],[role=radio][aria-checked="true"],.is-selected,[data-selected="true"]');
          if(sel) return (sel.getAttribute('aria-label')||sel.textContent||'').trim();
        }
      }
      return null;
    };
    return {
      color:    pick(['couleur','coloris','finition','color']),
      capacity: pick(['capacité','stockage','capacity','go','gb','to','tb'])
    };
  });
}

async function harvest(page, url){
  const items = []; // {sku,color,capacity}
  let model = 'iPhone';

  await page.goto(url, { waitUntil:'domcontentloaded', timeout:45000 }).catch(()=>{});
  await page.waitForLoadState('networkidle').catch(()=>{});

  try{
    const h1 = page.locator('h1').first();
    if(await h1.count()) model = (await h1.innerText()).replace(/^Acheter\s*/i,'').trim();
  }catch{}

  // Intercepte les requêtes parts.X (fulfillment-messages)
  page.on('request', async req=>{
    const u=req.url();
    if(!u.includes('fulfillment-messages') || !u.includes('parts.')) return;
    try{
      const q = new URL(u).searchParams;
      for(const [k,v] of q){
        if(!k.startsWith('parts.')) continue;
        if(PART_RE.test(v)){
          const snap = await snapshotSelected(page);
          items.push({ sku:v.trim(), color:snap.color||null, capacity:snap.capacity||null });
        }
      }
    }catch{}
  });

  // Clique toutes les options visibles (groupes radio)
  const groups = await page.locator('[role="radiogroup"]').all().catch(()=>[]);
  for(const g of groups){
    const radios = await g.locator('[role="radio"]').all();
    for(const r of radios){
      try{
        await r.click({ timeout:4000 });
        await page.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});
        await sleep(150);
      }catch{}
    }
  }
  // Scroll final pour déclencher d'éventuels XHR
  await page.mouse.wheel(0,1500).catch(()=>{});
  await sleep(300);

  // Regroupe en couleur → capacité → sku
  const map={};
  for(const it of items){
    if(!it.sku.endsWith(SUFFIX)) continue;
    const color = (it.color||'Couleur').replace(/\s+/g,' ').trim();
    const cap   = normCap(it.capacity||'');
    if(!map[color]) map[color]={};
    if(cap && !map[color][cap]) map[color][cap]=it.sku; // garde la 1ère occurrence
  }
  return { model, map };
}

(async ()=>{
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext({ locale:'fr-FR' });
  const page = await ctx.newPage();

  const output = {}; // modèle → couleur → capacité → SKU
  for(const url of BUY){
    try{
      const { model, map } = await harvest(page, url);
      if(Object.keys(map).length){
        output[model] = { ...(output[model]||{}), ...map };
        const count = Object.values(map).reduce((a,b)=>a+Object.keys(b).length,0);
        console.log(`✓ ${model}: ${count} variantes`);
      }else{
        console.log(`… aucun SKU récupéré pour ${url}`);
      }
    }catch(e){
      console.warn('! Skip', url, e?.message||e);
    }
  }

  fs.mkdirSync('public', { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`✅ Écrit ${OUT}`);
  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
