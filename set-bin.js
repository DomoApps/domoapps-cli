// set-bin.js
const fs = require('fs');
const pkg = require('./package.json');
const target = process.env.RYUU_BIN_TARGET || 'bin/runner';
if (pkg.bin && pkg.bin.domo !== target) {
  pkg.bin.domo = target;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Set package.json bin.domo to ${target}`);
} else {
  console.log('No change needed.');
}
