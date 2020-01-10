"use strict";
/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
 */
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
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