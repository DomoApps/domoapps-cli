import inquirer = require("inquirer");
import _ = require('lodash');
import * as chalk from 'chalk';
import shell = require('shelljs');
import { log } from '../util/log';
import { LoginData } from 'ryuu-client/models';
import Domo = require('ryuu-client');
import { Command } from 'commander';
import { Login } from '../util/login';
import Promise = require('bluebird');
import path = require('path');
import request = require('request-promise');
import multichoice from '../util/multichoice';
import { Oauth } from '../util/oauth';
import { IncomingMessage } from "http";
import { ProcessedMessage } from "../models/index";

module.exports = function(program: Command){
  program
    .command('remove')
    .option('--instance<value>', 'Name of instance to remove')
    .option('--all', "remove all instances")
    .description('remove a instance from the login list')
    .action(function(args){
        const previousLogins = Login.getPreviousLogins();
        const mayNotBeAuthenticated = true;
        let prompts = [];
        if (!args.instance) {
            if (previousLogins.length > 0) {
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
            else {
                console.log("There are no prior logins on this computer. Use domo login to log an instance before using this command");
            }
            inquirer.prompt(prompts).then((answers) => { Login.removeLogin(answers.instance)})
        }
    });
}