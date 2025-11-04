const _ = require('lodash');
import isValidJSName from '../util/isValidJSName';
import slug from 'slug';
const chalk = require('chalk');
import {mkdir} from 'shelljs';
import {reduce} from 'async';
import fs = require('fs-extra');
import path = require('path');
import {log} from '../util/log';
import {TEMPLATES, TemplateName, getTemplateFiles} from '../models/templates';
import {createConfirm, createInput, createSelect} from '../util/prompts';
//import { init, initOptions } from '../models';
import {Command, CommandOptions, Option} from 'commander';

module.exports = (program: Command) => {
  program
    .command('init')
    .option('-n, --design_name <value>', 'Name of the design')
    .addOption(
      new Option('-t, --template <value>', 'Name of the starter kit').choices([
        TemplateName.HELLO_WORLD,
        TemplateName.MANIFEST_ONLY,
        TemplateName.BASIC_CHART,
        TemplateName.MAP_CHART,
        TemplateName.SUGARFORCE,
      ]),
    )
    .option(
      '--no-datasets',
      'Skip dataset prompting (use with -i and -a to include specific datasets without prompting)',
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
    .action(async (options: CommandOptions) => {
      // Handle prompts with enquirer
      let answers: any = {};

      if (!(options as any).design_name) {
        answers.name = await createInput('design name');
      } else {
        answers.name = (options as any).design_name;
      }

      if (!(options as any).template) {
        answers.starter = await createSelect(
          'select a starter',
          Object.values(TEMPLATES).map(template => template.name),
        );
      } else {
        answers.starter = (options as any).template;
      }

      answers.datasources =
        (options as any).datasetId && (options as any).datasetAlias
          ? (options as any).datasetId.map((item: string, i: number) => {
              return {id: item, alias: (options as any).datasetAlias[i]};
            })
          : [];
      askDatasource(answers, options);
    });
};

// recursively ask user to enter all their datasources
const askDatasource = async (currentAnswers: any, options: CommandOptions) => {
  // Commander automatically sets 'datasets' to false when --no-datasets is provided
  if ((options as any)['datasets'] !== false) {
    const shouldAddDatasource = await createConfirm(
      currentAnswers.datasources.length > 0
        ? 'add another dataset?'
        : 'would you like to connect to any datasets?',
      true,
    );

    if (shouldAddDatasource) {
      try {
        const combinedAnswers = await addDatasource(
          _.merge(currentAnswers, {askDatasource: shouldAddDatasource}),
        );
        // ask for more datasources (recursive call)
        void askDatasource(combinedAnswers, options);
      } catch (err) {
        console.log('why' + err);
      }
    } else {
      // all done with datasources, continue on.
      void initiate(
        _.merge(currentAnswers, {askDatasource: shouldAddDatasource}),
      );
    }
  } else {
    const answers = {
      askDatasource: false,
    };
    void initiate(_.merge(currentAnswers, answers));
  }
};

const addDatasource = async (currentAnswers: any) => {
  const id = await createInput('dataset id');
  const alias = await createInput('dataset alias', '', (name: string) => {
    if (!isValidJSName(name))
      return 'Alias must be a valid JavaScript property';
    return true;
  });

  const datasource = {id, alias};

  currentAnswers.datasources.push(datasource);
  return currentAnswers;
};

const writeFilesIfNonexistent = (
  files: string[],
  dirs: string[] | null[],
  allAnswers: any,
  callback: (err: Error | null, filesThatExist: string[]) => void,
): void => {
  reduce(
    files,
    [],
    (filesThatExist, file, reduceCallback) => {
      fs.open(file, 'r', (err, fd) => {
        const fileExists = !err;
        if (fileExists) {
          fs.closeSync(fd);
          filesThatExist.push(file);
        }
        reduceCallback(null, filesThatExist);
      });
    },
    (err: Error | null, filesThatExist: string[]) => {
      if (filesThatExist.length > 0) {
        callback(null, filesThatExist);
      } else {
        _.zip(files, dirs).forEach(writeTemplateFile.bind(this, allAnswers));
        callback(null, files);
      }
    },
  );
};

const writeTemplateFile = (allAnswers: any, filedir: [string, string]) => {
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

const initiate = (allAnswers: any) => {
  let files: string[];
  let dirs: string[] | null[];
  let step = 0;
  const stepNumber = () => {
    step++;
    return `${step}.`;
  };
  let nextStepsMessage = 'Next steps: \n';
  const dirname = slug(allAnswers.name, {lower: false});

  if (allAnswers.starter === 'manifest only') {
    files = ['manifest.json'];
    dirs = [null];
    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === TemplateName.HELLO_WORLD) {
    files = getTemplateFiles(TemplateName.HELLO_WORLD);
    const templateDir = path.join(
      __dirname,
      '/../templates/',
      TemplateName.HELLO_WORLD + '/',
    );
    dirs = [...new Array(files.length)].map(_ => templateDir); // eslint-disable-line @typescript-eslint/no-unused-vars

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;
    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === TemplateName.BASIC_CHART) {
    files = getTemplateFiles(TemplateName.BASIC_CHART);
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      TemplateName.BASIC_CHART + '/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir); // eslint-disable-line @typescript-eslint/no-unused-vars

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === TemplateName.MAP_CHART) {
    files = getTemplateFiles(TemplateName.MAP_CHART);
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      TemplateName.MAP_CHART + '/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir); // eslint-disable-line @typescript-eslint/no-unused-vars

    nextStepsMessage += `${stepNumber()} ${chalk.cyan(
      'cd',
    )} into the ${chalk.green(dirname)} directory\n`;

    mkdir('-p', dirname);
    process.chdir(path.resolve(dirname));
  } else if (allAnswers.starter === TemplateName.SUGARFORCE) {
    files = getTemplateFiles(TemplateName.SUGARFORCE);
    const customChartTemplateDir = path.join(
      __dirname,
      '/../templates/',
      TemplateName.SUGARFORCE + '/',
    );
    dirs = [...new Array(files.length)].map(_ => customChartTemplateDir); // eslint-disable-line @typescript-eslint/no-unused-vars

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
  writeFilesIfNonexistent(files, dirs, allAnswers, (err: Error) => {
    const dirname = slug(allAnswers.name, {lower: false});
    if (err) {
      log.fail(
        'Cannot initialize new design. Doing so would overwrite existing files:' +
          err,
      );
    } else {
      nextStepsMessage += `${stepNumber()} Edit the files that were just generated. \n${stepNumber()} Run ${chalk.yellow(
        'domo login',
      )} if you haven't already. \n${stepNumber()} Run ${chalk.yellow(
        'domo publish',
      )} to finish initializiation and whenever you make changes. \n${stepNumber()} Run ${chalk.yellow(
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
  });
};
