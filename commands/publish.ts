import inquirer = require('inquirer');
import _ = require('lodash');
import open = require('open');
import {ManifestUtils} from '../util/manifest';
import {Login} from '../util/login';
import glob = require('glob');
import fs = require('fs-extra');
import {log} from '../util/log';
import appStructure = require('../util/appStructure');
import {constant, File} from '../models';
import Domo = require('ryuu-client');
import {Command, CommandOptions} from 'commander';
import multichoice from '../util/multichoice';
import {Manifest} from 'ryuu-client/lib/models';

module.exports = (program: Command) => {
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .option('-m, --manifest <value>', 'use a specific manifest file')
    .action(options => {
      const manifest = ManifestUtils.get(options.manifest, false);

      new Login()
        .getClient()
        .then(client => {
          if (client.getRefreshToken() === undefined) {
            log.notAuthenticated();
          }
          checkFileNames(manifest);
          if (!manifest.id) {
            createDesign(client, manifest, options);
          } else {
            client
              .getDesign(manifest.id, {parts: 'versions'})
              .then(result => {
                checkMapping(result, manifest);
                return publishAssets(client, manifest).then(() =>
                  linkToDomoWeb(options, client, manifest),
                );
              })
              .catch(e => publishErrors(e, client, manifest));
          }
        })
        .catch(log.notAuthenticated);
    });
};

const createDesign = (
  domo: Domo,
  manifest: Manifest,
  options?: CommandOptions,
) => {
  return (
    domo
      .createDesign(manifest)
      .then(designResult => {
        ManifestUtils.persistDesignId(designResult.id, manifest);
        log.ok('New design created on ' + domo.getInstance());
      })
      .catch(e => {
        log.fail('Error when creating new design:', e.message);
      })
      .then(() => domo.uploadAllAssets(manifest, manifest.ignore))
      //@ts-ignore
      .then(files => logUploadSuccess(files))
      .catch((e: string) => {
        log.fail(
          e || 'Error uploading assets in uploading assets for a new design',
        );
      })
      .then(() => {
        linkToDomoWeb(options, domo, manifest);
      })
  );
};

const logUploadSuccess = (files: File[]) => {
  files.forEach(file => {
    log.ok('Uploaded: ' + file.path);
  });
};

const linkToDomoWeb = (
  options: CommandOptions,
  domo: Domo,
  manifest: Manifest,
) => {
  console.log(
    'Design can be found at https://' +
      domo.getInstance() +
      '/assetlibrary?designId=' +
      manifest.id,
  );
  if (options && options['go']) {
    open(
      'https://' + domo.getInstance() + '/assetlibrary?designId=' + manifest.id,
    );
  }
};

const checkMapping = (result: any, manifest: Manifest) => {
  var latestVersionNumber = result.latestVersion;
  var latestVersion = result.versions.filter((obj: any) => {
    return obj.version === latestVersionNumber;
  });
  var oldMapping = latestVersion[0].datasetsMapping[0];
  var newMapping = manifest.datasetsMapping[0];

  if (oldMapping) {
    delete oldMapping.dql;
  }

  if (!_.isEqual(oldMapping, newMapping)) {
    log.warn(
      'Mapping has changed. Check current cards for potential miss-mappings.',
    );
  }
};

const checkFileNames = (manifest: Manifest) => {
  var ignore = ['**/*/node_modules/**/*', 'node_modules/**/*'];
  var userIgnore = manifest.ignore;
  if (userIgnore) {
    if (userIgnore instanceof Array) {
      ignore = ignore.concat(userIgnore);
    } else {
      log.fail('The manifest.json "ignore" property must be an Array');
    }
  }
  var badFileList = glob.sync('**/*', {ignore: ignore}).filter(file => {
    console.log(file);
    return (
      // special characters except "/" in file names are not allowed
      /[~`!#$%\^&*+=\[\]\\';,{}|\\":<>\?]/g.test(file) ||
      (!fs.lstatSync(file).isDirectory() && file.indexOf(' ') !== -1)
    );
  });
  if (badFileList.length > 0) {
    log.fail(
      'Special characters in file/directory names are not allowed as well as spaces in file names. Please rename the following file/directory(s): ' +
        badFileList,
    );
  }

  if (!appStructure.hasThumbnail()) {
    log.warn(constant.THUMBNAIL_CREATE_WARNING, constant.CREATE_THUMBNAIL);
  }
};

const recreateDesign = (domo: Domo, manifest: Manifest) => {
  inquirer
    .prompt(
      multichoice({
        type: 'list',
        message:
          'This design has been deleted. Would you like to undelete this design and publish to it, or create a new design with these assets?',
        name: 'askRecreate',
        choices: ['Undelete', 'Create New Design'],
      }),
    )
    .then((answers: inquirer.Answers) => {
      if (answers.askRecreate) {
        if (answers.askRecreate == 'Create New Design') {
          manifest.id = null;
          createDesign(domo, manifest);
        } else if (answers.askRecreate == 'Undelete') {
          domo.unDeleteDesign(manifest.id).then(() => {
            publishAssets(domo, manifest);
          });
        } else {
          log.ok('Exited without republishing design');
        }
      }
    });
};

const publishErrors = (e: any, domo: Domo, manifest: Manifest) => {
  if (e.statusCode === 400 && !e.message.startsWith('DA')) {
    log.fail('Design failed to publish with error:', e.message);
  } else if (e.statusCode === 401) {
    log.notAuthenticated(domo.getRefreshToken());
  } else if (e.statusCode === 403) {
    log.fail(
      'You do not have access to the design with id ' +
        manifest.id +
        ' on ' +
        domo.getInstance() +
        '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.' +
        '\nAlternatively, you may have inadvertently changed the design id.',
    );
  } else if (e.message?.substr(0, 23) == 'Design has been deleted')
    recreateDesign(domo, manifest);
  else if (e.message?.substr(0, 15) == 'No design found') {
    inquirer
      .prompt({
        type: 'confirm',
        message:
          'This design does not exist on ' +
          domo.getInstance() +
          '. Would you like to create a new design with these assets?',
        name: 'askCreate',
      })
      .then(answers => {
        if (answers.askCreate) {
          manifest.id = null;
          createDesign(domo, manifest);
        }
      });
  } else if (e.message && e.message.startsWith('DA')) {
    switch (e.message.substr(0, 6)) {
      case 'DA0086':
        log.warn(e.message);
        inquirer
          .prompt([
            {
              type: 'confirm',
              message:
                'This design has been deleted. Would you like to publish a new design with these assets?',
              name: 'askRecreate',
            },
          ])
          .then(answers => {
            if (answers.askRecreate) {
              manifest.id = null;
              createDesign(domo, manifest);
            }
          });

        break;
      default:
        // Pass on error messages that aren't in the set of documented errors.
        log.fail(e.message);
        break;
    }
  } else {
    //Error uploading assets
    log.fail(
      log.handleErrorMessage(
        e,
        'Error uploading assets in the upload all assets',
      ),
    );
  }
};

const publishAssets = (domo: Domo, manifest: Manifest) => {
  return domo
    .uploadAllAssets(manifest, manifest.ignore)
    .then(files => {
      log.ok(
        'Publishing ' +
          manifest.name +
          ' to ' +
          domo.getInstance() +
          ' on ' +
          new Date(),
      );
      //@ts-ignore
      logUploadSuccess(files);
    })
    .catch(e => {
      publishErrors(e, domo, manifest);
    });
};
