var inquirer = require("inquirer");
var _ = require('lodash');
var isValidJSName = require('../util/isValidJSName');
var slug = require('slug');
var chalk = require('chalk');
var shell = require('shelljs');
var async = require('async/reduce');
var fs = require('fs-extra');
var path = require('path');
var log = require('../util/log');
var multichoice = require('../util/multichoice');

module.exports = function(program){
  program
    .command('init')
    .option('--design_name <value>', 'Name of the design')
    .option('--starter <value>', 'Name of the starter kit')
    .option('--dataset <value>', 'Connect a dataset (y/n)')
    .description('initialize a new Custom App design')
    .action(function(options){
      let prompts = []
      if(!options.design_name){
        prompts.push({
          type: 'input',
          message: 'design name',
          name: 'name'
        })
      } else {}
      if(!options.starter){
        prompts.push(multichoice({
          type: 'list',
          message: 'select a starter',
          name: 'starter',
          choices: ['hello world', 'manifest only', 'basic chart', 'map chart']
        }))
      }
        inquirer.prompt(prompts, function(answers){
          if(options.design_name){
            answers.name = options.design_name
          }
          if(options.starter){
            answers.starter = options.starter
          }
            // answers.list = multichoice.answer(answers.list);
            answers.datasources = [];
            askDatasource(answers, options, initiate);
            function initiate (allAnswers){
              var files;
              var dirs;
              var step = 0;
              var nextStepsMessage = 'Next steps: \n';

              if(allAnswers.starter === 'manifest only'){
                files = ['manifest.json'];
                dirs = [null];
              }
              else if (allAnswers.starter === 'hello world'){
                files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js'];
                dirs = [null, null, null, null, null];

                var dirname = slug(answers.name);
                nextStepsMessage += `${stepNumber()} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

                shell.mkdir('-p', dirname);
                process.chdir(path.resolve(dirname));
              }
              else if (allAnswers.starter === 'basic chart') {
                files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenix.js'];
                const customChartTemplateDir = path.join(__dirname, '/../templates/', 'basic chart/');
                dirs = [ ...new Array(files.length) ].map(_ => customChartTemplateDir);

                var dirname = slug(answers.name);
                nextStepsMessage += `${stepNumber()} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

                shell.mkdir('-p', dirname);
                process.chdir(path.resolve(dirname));
              }
              else if (allAnswers.starter === 'map chart') {
                files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenixWithMaps.js'];
                const customChartTemplateDir = path.join(__dirname, '/../templates/', 'map chart/');
                dirs = [ ...new Array(files.length) ].map(_ => customChartTemplateDir);

                var dirname = slug(answers.name);
                nextStepsMessage += `${stepNumber()} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

                shell.mkdir('-p', dirname);
                process.chdir(path.resolve(dirname));
              }

              // populate and write out the template files
              writeFilesIfNonexistent(files, dirs, allAnswers, function(err, res) {
                if(err) {
                  log.fail('Cannot initialize new design. Doing so would overwrite existing files:' + err);
                }
                else {
                  nextStepsMessage += `${stepNumber()} Edit the files that were just generated. \n${stepNumber()} Run ${chalk.cyan('domo login')} if you haven't already. \n${stepNumber()} Run ${chalk.cyan('domo publish')} whenever you make changes. \n${stepNumber()} Add a Custom App card to any page in Domo. `;
                  log.ok(`New design initialized in the ${chalk.green(dirname || 'current')} directory`, nextStepsMessage);
                }

                if (allAnswers.starter === 'hello world'){
                  fs.remove('node_modules');
                }

                process.exit();

              });

              /**
               * Add an incrementing step to the instructions message
               */
              function stepNumber(){
                step++;
                return `${step}.`;
              }

            }
          });
    });
}


// recursively ask user to enter all their datasources
function askDatasource(currentAnswers, options, callback){
  if(!options.dataset || options.dataset == 'y' || options.dataset == 'Y'){
    inquirer.prompt([
    {
      type: 'confirm',
      message: currentAnswers.datasources.length > 0 ? 'add another dataset?' : 'would you like to connect to any datasets?',
      name: 'askDatasource'
    }
  ]).then(function(answers){
    if (answers.askDatasource){
      addDatasource(_.merge(currentAnswers, answers), function(combinedAnswers){
        // ask for more datasources
        askDatasource(combinedAnswers, callback);
      });
    }
    else {
      // all done with datasources, continue on.
      callback(_.merge(currentAnswers, answers));
    }
  });
}
  else { 
    let answers = {
      askDatasource : false
     }; 
    callback(_.merge(currentAnswers, answers))
  }
}


function addDatasource(currentAnswers, callback){
    inquirer.prompt([
      {
        type: 'input',
        message: 'dataset id',
        name: 'id'
      },
      {
        type: 'input',
        message: 'dataset alias',
        name: 'alias',
        validate: function(name){
          if (!isValidJSName(name)) return 'Alias must be a valid JavaScript property';
          return true;
        }
      }
    ]).then(function(datasource){
        currentAnswers.datasources.push(datasource);
        callback(currentAnswers);
    });
}

function writeFilesIfNonexistent(files, dirs, allAnswers, callback) {
  async.reduce(files, [], function(filesThatExist, file, reduceCallback) {
    fs.open(file,'r',function(err, fd) {
      var fileExists = !err;
      if(fileExists) {
        fs.closeSync(fd);
        filesThatExist.push(file);
      }
      reduceCallback(null, filesThatExist);
    });
  }, function(err, filesThatExist) {
    if(filesThatExist.length > 0) {
      callback(filesThatExist, null);
    }
    else {
      _.zip(files,dirs).forEach(writeTemplateFile);
      callback(null, files);
    }
  });

  function writeTemplateFile(filedir){
    var file = filedir[0];
    var dir = filedir[1];
    dir = dir || (__dirname + '/../templates/');
    var contents = _.template(fs.readFileSync(path.resolve(dir + file )))(allAnswers);

    fs.writeFileSync(process.cwd() + '/' + file, contents);
  }
}
