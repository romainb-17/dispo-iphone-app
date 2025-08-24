const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ On fige sur public/ (aucun dist/build possible)
const staticDir = path.join(process.cwd(), 'public');
console.log('👉 Serving ONLY from', staticDir);

// No cache (évite de revoir une ancienne page côté client)
app.use((req,res,next)=>{res.set('Cache-Control','no-store'); next();});
app.use(express.static(staticDir, { etag:false, cacheControl:false }));

app.get('/healthz', (req,res)=>res.status(200).send('ok'));

// Endpoint de debug pour vérifier ce que sert le serveur
app.get('/__debug', (_req,res)=>{
  res.json({
    staticDir,
    has_public_index: fs.existsSync(path.join(staticDir,'index.html')),
    has_dist_index: fs.existsSync(path.join(process.cwd(),'dist','index.html')),
    has_build_index: fs.existsSync(path.join(process.cwd(),'build','index.html')),
    now: new Date().toISOString()
  });
});

// Si une vieille page appelle /ui-map.js, on renvoie 410 (Gone)
app.get(['/ui-map.js','/public/ui-map.js'], (_req,res)=>res.status(410).send('gone'));

// Fallback SPA
app.get('*', (req,res,next)=>{
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(staticDir, 'index.html'), err => err && next(err));
});

app.listen(PORT, ()=>console.log(`✅ Listening on :${PORT}`));
