"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
 * Further clarification as of 3/2020: There is an issue with gitbash that doesn't allow
 *    stdin with readline. We will continue to use this as a workaround while this remains an issue
 *    (which appears to be for the unforseeable future)
 */
var isWindows = /^win/.test(process.platform);
function default_1(questions) {
    if (!isWindows) {
        return questions;
    }
    else {
        questions.type = 'rawlist';
        return questions;
    }
}
exports.default = default_1;
//# sourceMappingURL=multichoice.js.map