/**
 * Safe local cleanup (no npm deps): dist output, Python bytecode caches in backend source.
 * Skips backend/.venv so we do not churn site-packages __pycache__.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function rmDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function removeDist() {
  const dist = path.join(root, 'dist');
  if (fs.existsSync(dist)) {
    rmDir(dist);
    console.log('Removed dist/');
  } else {
    console.log('dist/ already absent');
  }
}

function removeBackendPycache() {
  const backend = path.join(root, 'backend');
  if (!fs.existsSync(backend)) return;

  const stack = [backend];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === '.venv' || ent.name === 'venv') continue;
        if (ent.name === '__pycache__') {
          rmDir(full);
          console.log('Removed', path.relative(root, full));
        } else {
          stack.push(full);
        }
      }
    }
  }
}

removeDist();
removeBackendPycache();
console.log('clean-project: done');
