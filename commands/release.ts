import inquirer = require('inquirer');
import {ManifestUtils} from '../util/manifest';
import {Login} from '../util/login';
import {log} from '../util/log';
import appStructure = require('../util/appStructure');
import {constant} from '../models/index';
import {Command} from 'commander';

module.exports = (program: Command) => {
  program
    .command('release')
    .description('prepare a design for app store release')
    .action(() => {
      new Login().getClient().then(client => {
        var manifest = ManifestUtils.getManifest(program.opts().manifest, true);

        // make sure app has been published first
        if (!manifest.id) {
          log.fail(
            "Can't release until design is published.",
            'Please publish your Custom App design (with the `domo publish` command) first',
          );
        }

        // make sure there is a thumbnail.png when releasing
        if (!appStructure.hasThumbnail()) {
          log.fail(
            constant.THUMBNAIL_CREATE_WARNING,
            constant.CREATE_THUMBNAIL,
          );
        }

        // prompt the user for which design version they want to release, defaulting to latest
        client
          .getVersions(manifest.id)
          .then(versions => {
            versions.reverse();
            versions.unshift('latest');

            inquirer
              .prompt([
                {
                  type: 'list',
                  message: 'select a version to release',
                  name: 'version',
                  choices: versions,
                },
              ])
              .then(answers => {
                // release the kraken
                client
                  .release(manifest.id, answers.version)
                  .then(() =>
                    log.ok('Design version (' + answers.version + ') released'),
                  )
                  .catch(log.fail);
              });
          })
          .catch(() => log.clientRequestFailed('Error releasing app design'));
      });
    });
};
