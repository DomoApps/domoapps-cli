import fs = require('fs-extra');
import path = require('path');
import extract = require('extract-zip');
import inquirer = require('inquirer');
import shell = require('shelljs');
import { Login } from'../util/login';
import Domo = require('ryuu-client');
import { log } from '../util/log';
import { Command } from 'commander';

module.exports = function(program: Command){
  program
    .command('download')
    .description('download a Custom App design')
    .option('-i, --design-id <id>', 'design id')
    .option('-d, --design-version <design-version>', 'design version')
    .action(function(args){
      Login.getMostRecentLogin().then(function(domo) {
        var prompts = [];

        if (!args.designId) {
          prompts.push({
            type: 'input',
            message: 'design id',
            name: 'designId'
          });
        }

        if (!args.designVersion) {
          prompts.push({
            type: 'input',
            message: 'version',
            name: 'version',
            default: 'latest'
          });
        }
        inquirer.prompt(prompts)
          .then(function(answers: inquirer.Answers){
          answers.designId = args.designId || answers.designId;
          answers.version = args.designVersion || answers.version;

          domo.download(answers['designId'], answers['version']).then(function(req) {
            //@ts-ignore
            
              if (req.status === 200) {
                var regexp = /filename="(.*)"/;
                var name = req.headers['content-disposition'].match(regexp)[1] || 'domoapp';
              } else {
                log.fail('Design not found. Make sure you have the correct design id.');
              }
              
             //var name = "test2"
              var writeStream = fs.createWriteStream('./'+name+'.zip', {flags: 'w+', mode: 0o666});
              //@ts-ignore
              req.data.pipe(writeStream);

              writeStream.on('finish', function(){
                var source = path.resolve('./'+name+'.zip');
                var target = path.resolve('./'+name);

                extract(source, {dir: target}).catch(function() {
                    shell.chmod('-R', 'u+w', target);
                    fs.remove(source);
                    process.exit();
                });
              });
          })
          .catch(() => log.clientRequestFailed('Unable to download design ' + answers.designId));
        });
      }).catch(log.notAuthenticated);
    });
}
