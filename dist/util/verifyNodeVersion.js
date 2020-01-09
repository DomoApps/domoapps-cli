var semver = require('semver');
var log = require('../util/log');
module.exports = function verifyNodeVersion() {
    var version = semver(process.version);
    var compatible = semver.gte(version, '5.0.0');
    if (!compatible) {
        log.fail('Unsupported Node version', 'Please upgrade to Node v5.0.0 or higher. https://nodejs.org/');
    }
};
//# sourceMappingURL=verifyNodeVersion.js.map