export async function checkAvailability({ postal='', onlyAvailable=false }){
  const stores = [
    { name:'Apple Store Opéra', city:'Paris', cp:'75009', distanceKm:2.1, pickup:"Aujourd'hui", status:'ok' },
    { name:'Apple Store Marché Saint-Germain', city:'Paris', cp:'75006', distanceKm:3.2, pickup:'Demain', status:'soon' },
    { name:'Apple Store La Défense', city:'Puteaux', cp:'92800', distanceKm:8.9, pickup:'—', status:'no' },
    { name:'Apple Store Parly 2', city:'Le Chesnay', cp:'78150', distanceKm:18.4, pickup:'Demain', status:'soon' },
    { name:'Apple Store Sainte-Catherine', city:'Bordeaux', cp:'33000', distanceKm:580, pickup:"Aujourd'hui", status:'ok' }
  ];
  let results = [...stores];
  if (/^\d{2}/.test(postal)) {
    const dept = postal.slice(0,2);
    results.sort((a,b)=> (a.cp.startsWith(dept)?-1:1) - (b.cp.startsWith(dept)?-1:1) || a.distanceKm - b.distanceKm);
  } else {
    results.sort((a,b)=> a.distanceKm - b.distanceKm);
  }
  return onlyAvailable ? results.filter(r=>r.status==='ok') : results;
}
