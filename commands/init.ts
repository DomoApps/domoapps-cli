import inquirer = require('inquirer');
import _ = require('lodash');
import isValidJSName from '../util/isValidJSName';
import slug = require('slug');
import * as chalk from 'chalk';
import {mkdir} from 'shelljs';
import {reduce} from 'async';
import fs = require('fs-extra');
import path = require('path');
import {log} from '../util/log';
import multichoice from '../util/multichoice';
//import { init, initOptions } from '../models';
import {Command, CommandOptions, option, Option} from 'commander';

module.exports = function (program: Command) {
  program
    .command('init')
    .option('-n, --design_name <value>', 'Name of the design')
    .addOption(
      new Option('-s, --starter <value>', 'Name of the starter kit').choices([
        'hello world',
        'manifest only',
        'basic chart',
        'map chart',
        'sugarforce',
      ]),
    )
    .option(
      '-d, --dataset-prompt',
      'Include this flag if you wish to skip the prompting for datasets',
    )
    .option(
      '-i, --dataset-id [value...]',
      'Give dataset ids as multiple arguments after the flag instead of using the prompt',
    )
    .option(
      '-a, --dataset-alias [value...]',
      'Give dataset aliases as multiple arguments after the flag instead of using the prompt',
    )
    .description('initialize a new Custom App design')
    .action(function (options) {
      let prompts = [];
      if (!options.design_name) {
        prompts.push({
          type: 'input',
          message: 'design name',
          name: 'name',
        });
      }
      if (!options.starter) {
        prompts.push(
          multichoice({
            type: 'list',
            message: 'select a starter',
            name: 'starter',
            choices: [
              'hello world',
              'manifest only',
              'basic chart',
              'map chart',
              'sugarforce',
            ],
          }),
        );
      }
      inquirer.prompt(prompts).then(answers => {
        if (options.design_name) {
          answers.name = options.design_name;
        }
        if (options.starter) {
          answers.starter = options.starter;
        }
        answers.datasources =
          options.datasetId && options.datasetAlias
            ? options.datasetId.map((item: string, i: number) => {
                return {id: item, alias: options.datasetAlias[i]};
              })
            : [];
        askDatasource(answers, options);
      });
    });
};

// recursively ask user to enter all their datasources
let askDatasource = (
  currentAnswers: inquirer.Answers,
  options: CommandOptions,
) => {
  if (!options['datasetPrompt']) {
    inquirer
      .prompt([
        {
          type: 'confirm',
          message:
            currentAnswers.datasources.length > 0
              ? 'add another dataset?'
              : 'would you like to connect to any datasets?',
          name: 'askDatasource',
        },
      ])
      .then(answers => {
        if (answers.askDatasource) {
          addDatasource(_.merge(currentAnswers, answers))
            .then(combinedAnswers => {
              // ask for more datasources
              askDatasource(combinedAnswers, options);
            })
            .catch(err => {
              console.log('why' + err);
            });
        } else {
          // all done with datasources, continue on.
          initiate(_.merge(currentAnswers, answers));
        }
      });
  } else {
    let answers = {
      askDatasource: false,
    };
    initiate(_.merge(currentAnswers, answers));
  }
};

let addDatasource = (currentAnswers: inquirer.Answers) => {
  return (
    inquirer
      .prompt([
        {
          type: 'input',
          message: 'dataset id',
          name: 'id',
        },
        {
          type: 'input',
          message: 'dataset alias',
          name: 'alias',
          validate: function (name) {
            if (!isValidJSName(name))
              return 'Alias must be a valid JavaScript property';
            return true;
          },
        },
      ])
      //issue right here
      .then(datasource => {
        currentAnswers.datasources.push(datasource);
        //askDatasource(currentAnswers, {dataSource: true});
        return Promise.resolve(currentAnswers);
      })
  );
};

let writeFilesIfNonexistent = (
  files: string[],
  dirs: string[] | null[],
  allAnswers: inquirer.Answers,
  callback: Function,
) => {
  reduce(
    files,
    [],
    function (filesThatExist, file, reduceCallback) {
      fs.open(file, 'r', function (err, fd) {
        let fileExists = !err;
        if (fileExists) {
          fs.closeSync(fd);
          filesThatExist.push(file);
        }
        reduceCallback(null, filesThatExist);
      });
    },
    function (err, filesThatExist) {
      if (filesThatExist.length > 0) {
        callback(filesThatExist, null);
      } else {
        _.zip(files, dirs).forEach(writeTemplateFile.bind(this, allAnswers));
        callback(null, files);
      }
    },
  );
};

let writeTemplateFile = (
  allAnswers: inquirer.Answers,
  filedir: [string, string],
) => {
  const templateFileExt = ['.js', '.css', '.html', '.json'];
  const file = filedir[0];
  const dir = filedir[1] || __dirname + '/../templates/';
  const filePath = path.resolve(dir + file);
  const destPath = path.parse(path.resolve(process.cwd(), file));
  let data;

  if (templateFileExt.some(ext => file.endsWith(ext))) {
    data = fs.readFileSync(filePath, 'utf8');
    data = _.template(data)(allAnswers);
  } else {
    data = fs.readFileSync(filePath);
  }

  fs.writeFileSync(path.resolve(destPath.dir, destPath.base), data);
};

let initiate = (allAnswers: inquirer.Answers) => {
  let files: string[];
  let dirs: string[] | null[];
  let step = 0;
  let stepNumber = () => {
    step++;
    return `${step}.`;
  };
  let nextStepsMessage = 'Next steps: \n';
  const dirname = slug(allAnswers.name, {lower: false});

  if (allAnswers.starter === 'manifest only') {
    files = ['manifest.json'];
    dirs = [null];
  } else if (allAnswers.starter === 'hello world') {
    files = ['manifest.json', 'index.html', 'app.js', 'app.css'];
    const templateDir = path.join(__dirname, '/../templates/', 'hello world/');
    dirs = [...new Array(files.length)].map(_ => templateDir);

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;
    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === 'basic chart') {
    files = ['manifest.json', 'index.html', 'app.js', 'app.css'];
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      'basic chart/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir);

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === 'map chart') {
    files = ['manifest.json', 'index.html', 'app.js', 'app.css'];
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      'map chart/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir);

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === 'sugarforce') {
    files = files = [
      'thumbnail.png',
      'manifest.json',
      'index.html',
      path.join('styles', 'app.css'),
      path.join('components', 'autocomplete.js'),
      path.join('components', 'floatingactionbutton.js'),
      path.join('components', 'modal.js'),
      path.join('components', 'router.js'),
      path.join('components', 'table.js'),
      path.join('js', 'app.js'),
      path.join('js', 'helpers.js'),
      path.join('js', 'home.js'),
      path.join('js', 'leads.js'),
      path.join('js', 'opportunities.js'),
      path.join('js', 'reports.js'),
      path.join('views', 'home.html'),
      path.join('views', 'leads.html'),
      path.join('views', 'opportunities.html'),
      path.join('views', 'reports.html'),
    ];
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      'sugarforce/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir);

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    mkdir('-p', path.join(dirname, 'styles'));
    mkdir('-p', path.join(dirname, 'components'));
    mkdir('-p', path.join(dirname, 'js'));
    mkdir('-p', path.join(dirname, 'views'));

    process.chdir(path.resolve(dirname));
  }

  // populate and write out the template files
  writeFilesIfNonexistent(
    files,
    dirs,
    allAnswers,
    function (err: Error, res: any[]) {
      const dirname = slug(allAnswers.name, {lower: false});
      if (err) {
        log.fail(
          'Cannot initialize new design. Doing so would overwrite existing files:' +
            err,
        );
      } else {
        nextStepsMessage += `${stepNumber()} Edit the files that were just generated. \n${stepNumber()} Run ${chalk.cyan(
          'domo login',
        )} if you haven't already. \n${stepNumber()} Run ${chalk.cyan(
          'domo publish',
        )} to finish initializiation and whenever you make changes. \n${stepNumber()} Run ${chalk.cyan(
          'domo dev',
        )} to see what your app will look like and locally develop\n${stepNumber()} Add a Custom App card from the design published to any page in Domo. `;
        log.ok(
          `New design initialized in the ${chalk.green(
            dirname || 'current',
          )} directory`,
          nextStepsMessage,
        );
      }
      if (allAnswers.starter === 'hello world') {
        fs.remove('node_modules');
      }
      process.exit();
    },
  );
};
