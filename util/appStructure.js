'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @return {Boolean}
 */
function hasThumbnail() {
  try {
    return fs.statSync(path.join(process.cwd(), 'thumbnail.png')).isFile();
  } catch (ignore) {
    return false;
  }
}

module.exports = { hasThumbnail };
