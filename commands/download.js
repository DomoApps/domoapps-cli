var fs = require('fs-extra');
var path = require('path');
var extract = require('extract-zip');
var inquirer = require('inquirer');
var shell = require('shelljs');
var Login = require('../util/login');
var Domo = require('ryuu-client');
var log = require('../util/log');

module.exports = function(program){
  program
    .command('download')
    .description('download a Custom App design')
    .option('-i, --design-id <id>', 'Design ID')
    .option('-d, --design-version <design-version>', 'Design version')
    .action(function(args){
      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);

      var domo = new Domo(login.instance, login.sid, login.devtoken);

      var prompts = [];

      if(!args.designId) {
        prompts.push({
          type: 'input',
          message: 'design id',
          name: 'designId'
        });
      }

      if(!args.designVersion) {
        prompts.push({
          type: 'input',
          message: 'version',
          name: 'version',
          default: 'latest'
        });
      }
      inquirer.prompt(prompts, function(answers){
        answers.designId = args.designId || answers.designId;
        answers.version = args.designVersion || answers.version;

        var req = domo.download(answers.designId, answers.version);

        req.on('response', function(response){
          if (response.statusCode === 200) {
            var regexp = /filename="(.*)"/;
            var name = response.headers['content-disposition'].match(regexp)[1] || 'domoapp';
          } else {
            log.fail('Design not found. Make sure you have the correct design id.');
          }

          var writeStream = fs.createWriteStream('./'+name+'.zip', {flags: 'w+', mode: 0o666});
          req.pipe(writeStream);

          writeStream.on('finish', function(){
            var source = path.resolve('./'+name+'.zip');
            var target = path.resolve('./'+name);

            extract(source, {dir: target}, function(err, results) {
              if (!err){
                shell.chmod('-R', 'u+w', target);
                fs.remove(source);
                process.exit();
              }
            });
          });
        });
      });

    });
}
