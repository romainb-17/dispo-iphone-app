# Récupérer les part numbers (SKUs) FR depuis Apple
1. Va sur https://www.apple.com/fr → page d’achat iPhone (16/Pro/Max), choisis **modèle/capacité/couleur**.
2. Ouvre DevTools (F12) → **Network** → filtre par **fulfillment-messages**.
3. Dans la réponse JSON, repère `partsAvailability` → champ `partNumber` (forme typique: `…ZD/A` pour FR).
4. Ajoute-le dans `data/apple_fr_skus.json` (ou via `/admin.html` avec ton `DEV_TOKEN`), puis teste une recherche.
