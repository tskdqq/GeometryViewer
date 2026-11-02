/**
 * Copy CRA build output to repo root for GitHub Pages (homepage: ".").
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const keepAtRoot = new Set([
  'graph_viewer.html',
  '_config.yml',
  'index.legacy.html',
  'src',
  'public',
  'config',
  'scripts',
  'node_modules',
  'build',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.git',
  '.gitignore',
]);

// Replace deployable static site from build/
if (fs.existsSync(path.join(root, 'static'))) {
  fs.rmSync(path.join(root, 'static'), { recursive: true, force: true });
}

for (const name of fs.readdirSync(buildDir)) {
  const src = path.join(buildDir, name);
  const dest = path.join(root, name);
  if (fs.existsSync(dest)) {
    if (fs.statSync(dest).isDirectory()) {
      fs.rmSync(dest, { recursive: true, force: true });
    } else {
      fs.unlinkSync(dest);
    }
  }
  copyRecursive(src, dest);
}

console.log('Deployed build/ to repository root.');
