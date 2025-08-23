const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const staticDir = path.join(process.cwd(), process.env.STATIC_DIR || "public");
console.log("👉 Serving from", staticDir);

app.use(express.static(staticDir));

app.get("/healthz", (req, res) => res.send("ok"));

app.get("*", (req, res) =>
  res.sendFile(path.join(staticDir, "index.html"))
);

app.listen(PORT, () => console.log(`✅ Listening on :${PORT}`));
