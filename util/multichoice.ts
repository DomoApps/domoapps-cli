import inquirer = require("inquirer");

/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
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
