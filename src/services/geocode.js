// src/services/geocode.js
export async function geocodePostalCodeFR(cp) {
  const clean = String(cp || '').trim();
  if (!/^\d{5}$/.test(clean)) throw new Error('Code postal invalide');

  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(clean)}&type=municipality&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const json = await res.json();

  const f = json.features?.[0];
  if (!f) throw new Error('Code postal introuvable');
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon, label: f.properties?.label || clean };
}
