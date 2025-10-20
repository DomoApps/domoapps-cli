#!/usr/bin/env node

process.on('unhandledRejection', on_unhandled_error);
process.on('uncaughtException', on_unhandled_error);

let already_warned = false;
function on_unhandled_error(err) {
  if (already_warned) {
    return;
  }

  already_warned = true;

  console.error('');
  console.error('❌ The Domo CLI encountered an error:');
  console.error('');
  console.error(`   ${err.message}`);
  console.error('');
  console.error('💡 Try updating to the latest version:');
  console.error('   npm install -g ryuu');
  console.error('');
  console.error('   If the issue persists, please contact support.');

  process.exit(1);
}

// enable source maps
require('source-map-support').install();

// Import the main domo module from the correct path
require('../dist/bin/domo.js');
