document.addEventListener('DOMContentLoaded', async ()=>{
  let sel = document.querySelector('#model, #modele, #product, select[name="model"]');

  // si aucun select modèle, on le crée à côté de l’input SKUs
  if(!sel){
    const row = document.querySelector('.row') || document.body;
    const lab = document.createElement('label');
    lab.textContent = 'Modèle ';
    sel = document.createElement('select');
    sel.id = 'model';
    sel.style.marginLeft = '6px';
    lab.appendChild(sel);
    row.appendChild(lab);
  }

  // déjà peuplé ? on ne touche pas
  if (sel.options && sel.options.length > 0) return;

  async function tryJson(path){
    try{ const r = await fetch(path, {cache:'no-store'}); if(!r.ok) return null; return await r.json(); }
    catch(e){ return null; }
  }

  // tente data locale
  let data = await tryJson('data/apple_fr_skus.json') || await tryJson('./data/apple_fr_skus.json');

  const options = [];
  if (Array.isArray(data)) {
    for (const it of data) {
      const sku = it.sku || it.partNumber || it.id || '';
      const label = it.label || it.name || it.title || sku;
      if (sku) options.push({label, sku});
    }
  }
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

  // synchronise avec l’input SKUs
  const skusInput = document.querySelector('#skus');
  if (skusInput) {
    const sync = ()=>{ skusInput.value = sel.value; };
    sel.addEventListener('change', sync);
    if (!skusInput.value.trim()) sync();
  }
});
