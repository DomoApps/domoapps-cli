import inquirer = require('inquirer');
import _ = require('lodash');
import isValidJSName from '../util/isValidJSName';
import slug = require('slug');
import chalk from 'chalk';
import { mkdir } from 'shelljs';
import { reduce } from 'async';
import fs = require('fs-extra');
import path = require('path');
import log = require('../util/log');
import multichoice from '../util/multichoice';
//import { init, initOptions } from '../models';
import { Command } from 'commander';

module.exports = function(program: Command){
  program
    .command('init')
    .option('--design_name <value>', 'Name of the design')
    .option('--starter <value>', 'Name of the starter kit')
    .option('--dataset <value>', 'Connect a dataset (y/n)')
    .description('initialize a new Custom App design')
    .action(function(options){
      let prompts = [];
      if(!options.design_name){
        prompts.push({
          type: 'input',
          message: 'design name',
          name: 'name'
        });
      }
      if(!options.starter){
        prompts.push(multichoice({
          type: 'list',
          message: 'select a starter',
          name: 'starter',
          choices: ['hello world', 'manifest only', 'basic chart', 'map chart']
        }));
      }
      inquirer.prompt(prompts).then((answers: any) => {
          if(options.design_name){
          answers.name = options.design_name;
          }
          if(options.starter){
          answers.starter = options.starter;
          }
          // answers.list = multichoice.answer(answers.list);
          answers.datasources = [];
          askDatasource(answers, options);
          });
    });
};


// recursively ask user to enter all their datasources
let askDatasource = (currentAnswers, options) => {
  if(!options.dataset){
    inquirer.prompt([{
      type: 'confirm',
      message: currentAnswers.datasources.length > 0 ? 'add another dataset?' : 'would you like to connect to any datasets?',
      name: 'askDatasource'
    }])
    .then(answers => {
      if (answers.askDatasource){
        addDatasource(_.merge(currentAnswers, answers))
        .then(combinedAnswers => {
          // ask for more datasources
          askDatasource(combinedAnswers, options);
        }).catch(err => {console.log("why" + err);});
      }
      else {
        // all done with datasources, continue on.
        initiate(_.merge(currentAnswers, answers));
      }
    })
  }
  else { 
    let answers = {
      askDatasource : false
     }; 
    initiate(_.merge(currentAnswers, answers))
  }
}


let addDatasource = (currentAnswers) => {
    return inquirer.prompt([{
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
    ])
    //issue right here
    .then(datasource => {
      currentAnswers.datasources.push(datasource);
      //askDatasource(currentAnswers, {dataSource: true});
      return Promise.resolve(currentAnswers);
    });
}

let writeFilesIfNonexistent = (files: string[], dirs: string[]| null[], allAnswers, callback: Function) => {
  reduce(files, [], function(filesThatExist, file, reduceCallback) {
    fs.open(file,'r',function(err, fd) {
      let fileExists = !err;
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
      _.zip(files, dirs).forEach(writeTemplateFile.bind(this, allAnswers));
      callback(null, files);
    }
  });
}

let writeTemplateFile = (allAnswers, filedir: string) => {
  const file = filedir[0];
  let dir = filedir[1];
  dir = dir || (__dirname + '/../templates/');
  const contents = _.template(fs.readFileSync(path.resolve(dir + file), "utf8"))(allAnswers);
  fs.writeFileSync(process.cwd() + '/' + file, contents);
}

let initiate = (allAnswers) => {
  let files: string[];
  let dirs: string[] | null[];
  let step = 0;
  let nextStepsMessage = 'Next steps: \n';

  if(allAnswers.starter === 'manifest only'){
    files = ['manifest.json'];
    dirs = [null];
  }
  else if (allAnswers.starter === 'hello world'){
    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js'];
    dirs = [null, null, null, null, null];

    const dirname = slug(allAnswers.name);
    nextStepsMessage += `${stepNumber(step)} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  }
  else if (allAnswers.starter === 'basic chart') {
    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenix.js'];
    const customChartTemplateDir = path.join(__dirname, '/../templates/', 'basic chart/');
    dirs = [ ...new Array(files.length) ].map(_ => customChartTemplateDir);

    const dirname = slug(allAnswers.name);
    nextStepsMessage += `${stepNumber(step)} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  }
  else if (allAnswers.starter === 'map chart') {
    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenixWithMaps.js'];
    const customChartTemplateDir = path.join(__dirname, '/../templates/', 'map chart/');
    dirs = [ ...new Array(files.length) ].map(_ => customChartTemplateDir);

    const dirname = slug(allAnswers.name);
    nextStepsMessage += `${stepNumber(step)} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  }

  // populate and write out the template files
  writeFilesIfNonexistent(files, dirs, allAnswers, function(err: Error, res: any[]) {
    if(err) {
      log.fail('Cannot initialize new design. Doing so would overwrite existing files:' + err);
    }
    else {
      nextStepsMessage += `${stepNumber(step)} Edit the files that were just generated. \n${stepNumber(step)} Run ${chalk.cyan('domo login')} if you haven't already. \n${stepNumber(step)} Run ${chalk.cyan('domo publish')} whenever you make changes. \n${stepNumber(step)} Add a Custom App card to any page in Domo. `;
      log.ok(`New design initialized in the ${chalk.green(__dirname || 'current')} directory`, nextStepsMessage);
    }
    if (allAnswers.starter === 'hello world'){
      fs.remove('node_modules');
    }
    process.exit();
  });
}
/**
   * Add an incrementing step to the instructions message
   */
let stepNumber = (step: number) => {
  step++;
  return `${step}.`;
}