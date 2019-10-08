/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
 */
var inquirer = require("inquirer");
var isWindows = /^win/.test(process.platform);
module.exports = function (questions) {
    if (!isWindows) {
        return questions;
    }
    else {
        questions.type = 'rawlist';
        return questions;
    }
};
//# sourceMappingURL=multichoice.js.map