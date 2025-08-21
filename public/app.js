const form = document.getElementById('checkerForm');
const badge = document.getElementById('resultsBadge');
const tableBody = document.querySelector('#resultsTable tbody');
const skeleton = document.getElementById('skeleton');

const setBadge = (t)=> badge.textContent = t;
const showSkeleton = (v)=> skeleton.hidden = !v;
function showError(id,msg=''){ const el=document.getElementById('err-'+id); if(el) el.textContent=msg; }

function validate(){
  let ok=true;
  const postal=document.getElementById('postal').value.trim();
  ['model','capacity','color','postal'].forEach(id=>showError(id,''));
  if(!document.getElementById('model').value){ showError('model','Obligatoire'); ok=false; }
  if(!document.getElementById('capacity').value){ showError('capacity','Obligatoire'); ok=false; }
  if(!document.getElementById('color').value){ showError('color','Obligatoire'); ok=false; }
  if(!postal || !/^\d{4,5}$/.test(postal)){ showError('postal','Code postal invalide'); ok=false; }
  return ok;
}

async function loadModels(){
  const r = await fetch('/api/models');
  const { models=[], capacities=[], colors=[], operators=[] } = await r.json();
  function fill(id, arr){ const el=document.getElementById(id); el.innerHTML = `<option value="" disabled selected>— Choisir —</option>` + arr.map(x=>`<option>${x}</option>`).join(''); }
  fill('model',models); fill('capacity',capacities); fill('color',colors);
  const op=document.getElementById('operator'); op.innerHTML = `<option value="">Aucun / Indifférent</option>` + operators.map(x=>`<option>${x}</option>`).join('');
}

async function handleCheck(e){
  e?.preventDefault();
  if(!validate()) return;
  const params=new URLSearchParams();
  ['model','capacity','color','postal','operator'].forEach(id=>{ const v=document.getElementById(id).value; if(v) params.set(id,v); });
  if(document.getElementById('onlyAvailable').checked) params.set('onlyAvailable','true');

  setBadge('Recherche…'); showSkeleton(true); tableBody.innerHTML='';
  const r=await fetch('/api/check?'+params.toString()); const data=await r.json();
  const list=data.results||[];
  tableBody.innerHTML = list.map(s => `<tr>
    <td>${s.name}</td><td>${s.city}</td><td>${(+s.distanceKm).toFixed(1)} km</td>
    <td><span class="badge ${s.status==='ok'?'badge--ok':s.status==='soon'?'badge--soon':'badge--no'}">${s.status==='ok'?'En stock':s.status==='soon'?'Bientôt':'Rupture'}</span></td>
    <td>${s.pickup||'—'}</td>
  </tr>`).join('');
  const okCount = list.filter(r=>r.status==='ok').length;
  setBadge(`${list.length} résultat${list.length>1?'s':''} • ${okCount} en stock`);
  showSkeleton(false);
}

form.addEventListener('submit', handleCheck);
document.addEventListener('DOMContentLoaded', loadModels);
