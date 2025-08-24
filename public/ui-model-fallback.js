document.addEventListener('DOMContentLoaded', async ()=>{
  const sel = document.querySelector('#model, #modele, #product, select[name="model"]');
  if(!sel) return;
  if (sel.options && sel.options.length > 0) return; // déjà rempli par ton script

  async function tryJson(path){
    try{ const r = await fetch(path, {cache:'no-store'}); if(!r.ok) return null; return await r.json(); }
    catch(e){ return null; }
  }

  // essaie de récupérer une liste locale si elle existe
  let data = await tryJson('data/apple_fr_skus.json') || await tryJson('./data/apple_fr_skus.json');

  const options = [];
  if (Array.isArray(data)) {
    for (const it of data) {
      const sku = it.sku || it.partNumber || it.id || '';
      const label = it.label || it.name || it.title || sku;
      if (sku) options.push({label, sku});
    }
  }
  // Fallback mini si aucun JSON dispo
  if (options.length === 0) {
    options.push({label:'iPhone 16 Pro 256 Go — exemple', sku:'MTUU3ZD/A'});
    options.push({label:'iPhone 16 Pro Max 256 Go — exemple', sku:'MTUV3ZD/A'});
  }

  sel.innerHTML = '';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.sku;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }

  // Lier au champ SKUs si présent
  const skusInput = document.querySelector('#skus');
  if (skusInput) {
    const sync = ()=>{ skusInput.value = sel.value; };
    sel.addEventListener('change', sync);
    sync();
  }
});
