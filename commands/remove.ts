import inquirer = require("inquirer");
import _ = require('lodash');
import * as chalk from 'chalk';
import shell = require('shelljs');
import { log } from '../util/log';
import { LoginData } from 'ryuu-client/models';
import Domo = require('ryuu-client');
import { Command, CommandOptions } from 'commander';
import { Login } from '../util/login';
import Promise = require('bluebird');
import path = require('path');
import multichoice from '../util/multichoice';

module.exports = function(program: Command){
  program
    .command('remove')
    .option('--instance <value>', 'Name of instance to remove')
    .option('-a, --all', 'remove all instances')
    .description('remove a instance from the login list')
    .action(function(options: CommandOptions){
        const previousLogins = Login.getPreviousLogins();
        const mayNotBeAuthenticated = true;
        let prompts = [];
        if (!options['instance']) {
            if (previousLogins.length > 0) {
                if (options['all']) {
                    prompts.push(multichoice({
                        type: "list",
                        choices: ['Yes', 'No'],
                        message: "Are you sure you'd like to delete all instances?",
                        name: 'removeAll'
                    }))
                }
                else {
                    prompts.push(multichoice({
                            type: "list",
                            choices: function() {
                                let options = _.map(previousLogins, 'instance');
                                return options;
                            },
                            message: "Select the instance you desire to remove ",
                            name: 'instance',
                        }),
                        multichoice({
                            type: "list",
                            choices: ['Yes', 'No'],
                            message: "Are you sure you'd like to remove this instance?",
                            name: "removeInstance",
                            when: function(answers: inquirer.Answers){
                            // only ask if an instance was selected
                            return !!answers.instance;
                            },
                        })
                    );
                }
            }
            else {
                log.fail("There are no prior logins on this computer. Use domo login to log an instance before using this command");
                process.exit();
            }
            inquirer.prompt(prompts).then((answers) => { 
                if (answers['removeAll'] === 'Yes') {
                    Login.removeAllLogins();
                    log.ok('All instances have been removed');
                }
                else if(answers['removeInstance']== 'Yes') {
                    Login.removeLogin(answers.instance)
                    log.ok('Instance removed successfully.')
                }
                else
                    log.ok('You have chosen not to remove any instances');
            })
        }
    });
}