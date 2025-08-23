const data = [
  { store: "Apple La Rochelle", city: "La Rochelle", model: "iPhone 16 Pro", color: "Titane Naturel", capacity: "256 GB", available: true,  distance_km: 2.3,  sku: "MTUU3ZD/A" },
  { store: "Apple Nantes",      city: "Nantes",       model: "iPhone 16 Pro", color: "Noir",           capacity: "512 GB", available: false, distance_km: 119,  sku: "MTUV3ZD/A" },
  { store: "Apple Bordeaux",    city: "Bordeaux",     model: "iPhone 16",     color: "Bleu",           capacity: "128 GB", available: true,  distance_km: 186,  sku: "MTTA3ZD/A" },
  { store: "Apple Odysseum",    city: "Montpellier",  model: "iPhone 16 Pro", color: "Titane Naturel", capacity: "256 GB", available: true,  distance_km: 705,  sku: "MTUU3ZD/A" }
];

const $ = (s)=>document.querySelector(s);
const uniq = (arr)=>[...new Set(arr.filter(Boolean))];

function populateFilters(items){
  const models = uniq(items.map(x=>x.model));
  const colors = uniq(items.map(x=>x.color));
  const caps   = uniq(items.map(x=>x.capacity));

  const addOpts = (sel, vals)=>vals.forEach(v=>{
    const o=document.createElement("option"); o.value=v; o.textContent=v; sel.appendChild(o);
  });

  addOpts($("#model"), models);
  addOpts($("#color"), colors);
  addOpts($("#capacity"), caps);
}

function applyFilters(){
  const m = $("#model").value;
  const c = $("#color").value;
  const k = $("#capacity").value;
  const city = $("#city").value.trim().toLowerCase();

  const filtered = data.filter(x =>
    (!m || x.model===m) &&
    (!c || x.color===c) &&
    (!k || x.capacity===k) &&
    (!city || x.city.toLowerCase().includes(city))
  );

  render(filtered);
}

function render(rows){
  const tb = $("#tbody");
  tb.innerHTML = "";
  $("#count").textContent = rows.length;
  rows.forEach(x=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `
      <td>${x.store}</td>
      <td>${x.city}</td>
      <td>${x.model}</td>
      <td>${x.color}</td>
      <td>${x.capacity}</td>
      <td class="${x.available?'ok':'ko'}">${x.available?'Oui':'Non'}</td>
      <td>${x.distance_km} km</td>
      <td>${x.sku}</td>`;
    tb.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  populateFilters(data);
  $("#refresh").addEventListener("click", applyFilters);
  applyFilters();
});
