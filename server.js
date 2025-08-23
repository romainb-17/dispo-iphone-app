const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

function pickStaticDir() {
  const candidates = [process.env.STATIC_DIR, "dist", "build", "public"].filter(Boolean);
  for (const dir of candidates) {
    const p = path.join(process.cwd(), dir, "index.html");
    if (fs.existsSync(p)) return dir;
  }
  return "public";
}

const chosen = pickStaticDir();
const staticDir = path.join(process.cwd(), chosen);
console.log("👉 Serving from", staticDir);

app.use(express.static(staticDir));
app.get("/healthz", (req, res) => res.send("ok"));
app.get("*", (req, res, next) => {
  res.sendFile(path.join(staticDir, "index.html"), (err) => err && next(err));
});

app.listen(PORT, () => console.log(`✅ Listening on :${PORT}`));
