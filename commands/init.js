var inquirer = require("inquirer");
var _ = require('lodash');
var isValidJSName = require('../util/isValidJSName');
var slug = require('slug');
var chalk = require('chalk');
var shell = require('shelljs');
var reduce = require('async/reduce');
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
          choices: ['hello world', 'manifest only', 'basic chart', 'map chart', 'sugarforce']
        }))
      }
        inquirer.prompt(prompts).then(function(answers){
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
              else if (allAnswers.starter === 'sugarforce') {
                files = files = [
                  'thumbnail.png',
                  'manifest.json',
                  'index.html',
                  path.join('styles','app.css'),
                  path.join('components','autocomplete.js'),
                  path.join('components','floatingactionbutton.js'),
                  path.join('components','modal.js'),
                  path.join('components','router.js'),
                  path.join('components','table.js'),
                  path.join('js','app.js'),
                  path.join('js','helpers.js'),
                  path.join('js','home.js'),
                  path.join('js','leads.js'),
                  path.join('js','opportunities.js'),
                  path.join('js','reports.js'),
                  path.join('js','domo.js'),
                  path.join('js','domoPhoenixWithMaps.js'),
                  path.join('views', 'home.html'),
                  path.join('views', 'leads.html'),
                  path.join('views', 'opportunities.html'),
                  path.join('views', 'reports.html')];
                const customChartTemplateDir = path.join(__dirname, '/../templates/', 'sugarforce/');
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
          askDatasource(combinedAnswers, options, callback);
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
  reduce(files, [], function(filesThatExist, file, reduceCallback) {
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
    const templateFileExt = ['.js', '.css', '.html', '.json'];
    const file = filedir[0];
    const dir = filedir[1] || (__dirname + '/../templates/');
    const filePath = path.resolve(dir + file);
    let data = fs.readFileSync(filePath);

    if (templateFileExt.some(ext => file.endsWith(ext))){
      data = _.template(data)(allAnswers);
    }

    var destPath = path.parse(path.resolve(process.cwd(), file));
    if (!fs.existsSync(destPath.dir)) {
      fs.mkdirSync(destPath.dir, {recursive: true});
    }

    fs.writeFileSync(path.resolve(destPath.dir, destPath.base), data);
  }
}
