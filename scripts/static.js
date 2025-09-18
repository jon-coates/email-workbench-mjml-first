#!/usr/bin/env node
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const ROOT = process.cwd();

app.use(express.static(path.join(ROOT, 'public')));

app.listen(PORT, () => {
  console.log(`Serving ./public at http://localhost:${PORT}`);
});
