
/* Static UI */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import express from 'express';
app.use(express.static(path.join(__dirname, 'public')));
