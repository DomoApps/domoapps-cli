const fs = require('fs');
const path = require('path');

export function hasThumbnail(): boolean {
  try {
    return fs.statSync(path.join(process.cwd(), 'thumbnail.png')).isFile();
  }
  catch (ignore) {
    return false;
  }
};
