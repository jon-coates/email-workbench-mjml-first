#!/usr/bin/env node
const { spawn } = require('child_process');
const chokidar = require('chokidar');

function runBuild() {
  const p = spawn('node', ['scripts/build.js'], { stdio: 'inherit' });
  p.on('close', (code) => {
    if (code !== 0) console.error('Build failed with code', code);
  });
}

let ready = false;
const watcher = chokidar.watch(['src/**/*', 'data/**/*'], {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
});

watcher
  .on('ready', () => { ready = true; runBuild(); console.log('Watching for changes...'); })
  .on('all', (event, path) => {
    if (!ready) return;
    console.log(`[${event}] ${path}`);
    runBuild();
  });
