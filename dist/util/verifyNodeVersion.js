"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var semver_1 = require("semver");
var log = require("../util/log");
module.exports = function verifyNodeVersion() {
    var version = new semver_1.SemVer(process.version);
    var compatible = semver_1.gte(version, '5.0.0');
    if (!compatible) {
        log.fail('Unsupported Node version', 'Please upgrade to Node v5.0.0 or higher. https://nodejs.org/');
    }
};
//# sourceMappingURL=verifyNodeVersion.js.map