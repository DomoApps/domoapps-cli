var inquirer = require("inquirer");
var _ = require('lodash');
var chalk = require('chalk');
var shell = require('shelljs');
var multichoice = require('../util/multichoice');
var log = require('../util/log');
var Login = require('../util/login');
var evoke = require('../util/evoke');
var Domo = require('ryuu-client');
var Promise = require('bluebird');
var path = require('path');
var request = Promise.promisify(require('request'));

module.exports = function(program){
  program
    .command('logout')
    .description('logout of Domo')
    .action(function(){

      var mostRecent = Login.getMostRecentLogin();
      var instance = mostRecent.instance;
      Login.verifyLogout(mostRecent, instance);

      mostRecent.sid ? delete mostRecent.sid : delete mostRecent.devtoken;
      Login.writeLogin(mostRecent);
      Login.verifyLogout(mostRecent, instance);
    });
}
