// src/services/stores.js
import { haversineKm } from '../lib/distance.js';

export const APPLE_STORES_FR = [
  { id:"AIX",   name:"Apple Aix-en-Provence", lat:43.5285, lon:5.4481 },
  { id:"CC",    name:"Apple Cap 3000 (Nice)", lat:43.6540, lon:7.1970 },
  { id:"CF",    name:"Apple Carré Sénart",    lat:48.6086, lon:2.5826 },
  { id:"CON",   name:"Apple Confluence (Lyon)",lat:45.7425, lon:4.8190 },
  { id:"LIL",   name:"Apple Lille",           lat:50.6372, lon:3.0638 },
  { id:"LYO",   name:"Apple Part-Dieu (Lyon)",lat:45.7600, lon:4.8570 },
  { id:"MAR",   name:"Apple Marseille Terrasses du Port", lat:43.3149, lon:5.3606 },
  { id:"PAR1",  name:"Apple Champs-Élysées",  lat:48.8706, lon:2.3045 },
  { id:"PAR2",  name:"Apple Opéra",           lat:48.8698, lon:2.3324 },
  { id:"PAR3",  name:"Apple Odéon",           lat:48.8519, lon:2.3387 },
  { id:"PAR4",  name:"Apple Marché Saint-Germain", lat:48.8532, lon:2.3371 },
  { id:"PAR5",  name:"Apple Rosny 2",         lat:48.8766, lon:2.4837 },
  { id:"PAR6",  name:"Apple Vélizy 2",        lat:48.7827, lon:2.2181 },
  { id:"PAR7",  name:"Apple Les 4 Temps",     lat:48.8926, lon:2.2369 },
  { id:"PAR8",  name:"Apple Parly 2",         lat:48.8272, lon:2.1132 },
  { id:"PAR9",  name:"Apple So Ouest",        lat:48.8933, lon:2.2946 },
  { id:"REN",   name:"Apple Rennes",          lat:48.1116, lon:-1.6800 },
  { id:"STR",   name:"Apple Strasbourg",      lat:48.5839, lon:7.7455 },
  { id:"TLS",   name:"Apple Toulouse",        lat:43.6045, lon:1.4440 },
  { id:"BOR",   name:"Apple Bordeaux",        lat:44.8426, lon:-0.5775 },
  { id:"NAN",   name:"Apple Atlantis (Nantes)",lat:47.2136, lon:-1.6318 }
];

export function nearestStoreTo({ lat, lon }) {
  let best = null;
  for (const s of APPLE_STORES_FR) {
    const d = haversineKm({lat,lon}, {lat:s.lat, lon:s.lon});
    if (!best || d < best.distanceKm) best = { ...s, distanceKm: d };
  }
  return best;
}
