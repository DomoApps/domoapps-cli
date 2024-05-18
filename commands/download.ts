import fs = require('fs-extra');
import path = require('path');
import extract = require('extract-zip');
import inquirer = require('inquirer');
import shell = require('shelljs');
import {Login} from '../util/login';
import {log} from '../util/log';
import {Command} from 'commander';

module.exports = function (program: Command) {
  program
    .command('download')
    .description('download a Custom App design')
    .option('-i, --design-id <id>', 'design id')
    .option('-d, --design-version <design-version>', 'design version')
    .action(args => {
      new Login()
        .getClient()
        .then(client => {
          const prompts = [];
          if (!args.designId) {
            prompts.push({
              type: 'input',
              message: 'design id',
              name: 'designId',
            });
          }
          if (!args.designVersion) {
            prompts.push({
              type: 'input',
              message: 'version',
              name: 'version',
              default: 'latest',
            });
          }
          inquirer.prompt(prompts).then((answers: inquirer.Answers) => {
            const designId = args.designId || answers.designId;
            const version = args.designVersion || answers.version;
            client
              .download(designId, version)
              .then(req => {
                if (req.status === 200) {
                  const regexp = /filename="(.*)"/;
                  const name =
                    req.headers['content-disposition'].match(regexp)[1] ||
                    'domoapp';
                  const writeStream = fs.createWriteStream(
                    './' + name + '.zip',
                    {
                      flags: 'w+',
                      mode: 0o666,
                    },
                  );
                  //@ts-ignore
                  req.data.pipe(writeStream);

                  writeStream.on('finish', () => {
                    const source = path.resolve('./' + name + '.zip');
                    const target = path.resolve('./' + name);

                    extract(source, {dir: target}).catch(() => {
                      shell.chmod('-R', 'u+w', target);
                      fs.remove(source);
                      log.fail(
                        'Extraction of design from its compressed zip file failed, removing downloaded zip.',
                      );
                    });
                  });
                } else {
                  log.fail(
                    'Design not found. Make sure you have the correct design id.',
                  );
                }
              })
              .catch(e =>
                log.clientRequestFailed(
                  'Unable to download design ' + designId,
                ),
              );
          });
        })
        .catch(log.notAuthenticated);
    });
};
