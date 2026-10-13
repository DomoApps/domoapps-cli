#!/usr/bin/env bash
# Usage: same-artifact.sh <a.tgz> <b.tgz>
#
# Exits 0 when two `npm pack` tarballs ship identical files, 1 (and says what differs) when they don't,
# and 2 when it could not compare them. Compares names, file modes, symlinks and SHA-256 of contents.
# In package.json it ignores the fields that never reach a consumer's install: version, devDependencies,
# gitHead, and every script except the ones npm runs when the package is installed.
set -euo pipefail

[ $# -eq 2 ] || { echo "usage: $0 <a.tgz> <b.tgz>" >&2; exit 2; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/a" "$work/b"
tar -xzf "$1" -C "$work/a" || { echo "same-artifact: cannot extract $1" >&2; exit 2; }
tar -xzf "$2" -C "$work/b" || { echo "same-artifact: cannot extract $2" >&2; exit 2; }

node - "$work/a/package" "$work/b/package" "$(basename "$1")" "$(basename "$2")" << 'EOF'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare'];

function normalizePackageJson(data) {
  const pkg = JSON.parse(data);
  delete pkg.version;
  delete pkg.devDependencies;
  delete pkg.gitHead;
  if (pkg.scripts) {
    pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts).filter(([k]) => INSTALL_SCRIPTS.includes(k)));
    if (!Object.keys(pkg.scripts).length) delete pkg.scripts;
  }
  return Buffer.from(JSON.stringify(pkg, null, 2));
}

function describe(root) {
  const entries = new Map();
  (function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      const st = fs.lstatSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isSymbolicLink()) entries.set(rel, `symlink -> ${fs.readlinkSync(full)}`);
      else {
        let data = fs.readFileSync(full);
        if (rel === 'package.json') data = normalizePackageJson(data);
        const mode = (st.mode & 0o777).toString(8);
        entries.set(rel, `mode ${mode} sha256 ${crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)}`);
      }
    }
  })(root);
  return entries;
}

try {
  const [a, b, nameA, nameB] = process.argv.slice(2);
  const left = describe(a);
  const right = describe(b);
  const diffs = [];
  for (const file of new Set([...left.keys(), ...right.keys()])) {
    if (!left.has(file)) diffs.push(`only in ${nameB}: ${file}`);
    else if (!right.has(file)) diffs.push(`only in ${nameA}: ${file}`);
    else if (left.get(file) !== right.get(file)) diffs.push(`differs: ${file}`);
  }
  if (!diffs.length) {
    console.log(`same-artifact: ${nameA} and ${nameB} ship identical files`);
  } else {
    console.log(`same-artifact: ${nameA} and ${nameB} differ:`);
    for (const d of diffs.sort()) console.log(`  ${d}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`same-artifact: ${err.message}`);
  process.exitCode = 2;
}
EOF
