import inquirer = require("inquirer");

/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
 * Further clarification as of 3/2020: There is an issue with gitbash that doesn't allow
 *    stdin with readline. We will continue to use this as a workaround while this remains an issue
 *    (which appears to be for the unforseeable future)
 */

const isWindows = /^win/.test(process.platform);

export default function(questions: inquirer.Question) {
  if (!isWindows) {
    return questions;
  }
  else {
    questions.type = 'rawlist';
    return questions;
  }
}
