import inquirer = require("inquirer");
import Bluebird = require('bluebird');
import { login } from '../models';
import _ = require('lodash');

interface InquirerAutocompleteOptions extends inquirer.ListQuestionOptions {
  source?: (answers: inquirer.Answers, input: string) => Bluebird<Iterable<any>>;
}

/**
 * Abstraction around multichoice questions that works in Windows, despite https://github.com/nodejs/node/issues/5384
 * Uses arrow keys for non-windows and number selection for windows
 * Further clarification as of 3/2020: There is an issue with gitbash that doesn't allow
 *    stdin with readline. We will continue to use this as a workaround while this remains an issue
 *    (which appears to be for the unforseeable future)
 */

const isWindows = /^win/.test(process.platform);

export default function(questions: InquirerAutocompleteOptions, previousLogins?: Array<login>, NEW_INSTANCE?: string) {
  if (!isWindows) {
    return questions;
  }
  else {
    questions.type = 'rawlist';
    questions.pageSize = 20;
    if (previousLogins) {
      questions.choices = function() {
        let options = _.map(previousLogins, 'instance');
        options.push(NEW_INSTANCE);
        return options;
      }
    }
    return questions;
  }
}
