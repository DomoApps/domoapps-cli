import { SemVer } from 'semver';
import { gte } from 'semver';
import { log } from './log';

module.exports = function verifyNodeVersion() {
  const version = new SemVer(process.version);
  const compatible = gte(version, '5.0.0');
  if (!compatible){
    log.fail('Unsupported Node version', 'Please upgrade to Node v5.0.0 or higher. https://nodejs.org/');
  }
}
