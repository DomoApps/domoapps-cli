var semver = require('semver');
var log = require('../util/log');

module.exports = function verifyNodeVersion() {
  var version = semver(process.version);
  var compatible = semver.gte(version, '0.12.0');
  if (!compatible){
    log.fail('Unsupported Node version', 'Please upgrade to Node v0.12.0 or higher. https://nodejs.org/');
  }
}
