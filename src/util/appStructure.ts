import * as fs from 'fs';
import * as path from 'path';

export function hasThumbnail(): boolean {
  try {
    return fs.statSync(path.join(process.cwd(), 'thumbnail.png')).isFile();
  } catch (ignore) {
    return false;
  }
}
