import _ from 'lodash';
import open from 'open';
import path from 'path';
import {ManifestUtils} from '../util/manifest.js';
import {Login} from '../util/login.js';
import {globSync} from 'glob';
import fs from 'fs-extra';
import {log} from '../util/log.js';
import * as appStructure from '../util/appStructure.js';
import {constant, PublishCommandOptions} from '../models/index.js';
import {Command} from 'commander';
import {createConfirm, createSelect} from '../util/prompts.js';

type Manifest = any;
type Asset = any;

export default (program: Command) => {
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .option(
      '-d, --build-dir <path>',
      'path to build directory containing the app files',
    )
    .action(options => {
      const manifest = ManifestUtils.getManifest(program.opts().manifest, true);

      // Change to build directory if specified
      if (options.buildDir) {
        const buildPath = path.resolve(options.buildDir);
        if (!fs.existsSync(buildPath)) {
          log.fail(
            `Build directory not found: ${buildPath}`,
            'Please provide a valid path to your build directory.',
          );
          process.exit(1);
        }
        if (!fs.statSync(buildPath).isDirectory()) {
          log.fail(
            `Path is not a directory: ${buildPath}`,
            'Please provide a valid directory path.',
          );
          process.exit(1);
        }

        log.info(`Using build directory: ${buildPath}`);
        process.chdir(buildPath);
      }

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
  domo: any,
  manifest: Manifest,
  options?: PublishCommandOptions,
) => {
  return domo
    .createDesign(manifest)
    .then((designResult: any) => {
      const newManifestId = ManifestUtils.persistDesignId(
        designResult.id,
        manifest,
      );
      manifest = {...manifest, id: newManifestId};
      log.ok('New design created on ' + domo.getInstance());
    })
    .catch((e: any) => {
      log.fail('Error when creating new design:', e.message);
    })
    .then(() => domo.uploadAllAssets(manifest))
    .then((files: any) => logUploadSuccess(files as any))
    .catch((e: string) => {
      log.fail(
        e || 'Error uploading assets in uploading assets for a new design',
      );
    })
    .then(() => {
      linkToDomoWeb(options, domo, manifest);
    });
};

const logUploadSuccess = (files: Asset[]) => {
  files.forEach(file => {
    log.ok('Uploaded: ' + file.path);
  });
};

const linkToDomoWeb = (
  options: PublishCommandOptions | undefined,
  domo: any,
  manifest: Manifest,
) => {
  console.log(
    'Design can be found at https://' +
      domo.getInstance() +
      '/assetlibrary?designId=' +
      manifest.id,
  );
  if (options && options.go) {
    open(
      'https://' + domo.getInstance() + '/assetlibrary?designId=' + manifest.id,
    );
  }
};

const checkMapping = (result: any, manifest: Manifest) => {
  const latestVersionNumber = result.latestVersion;
  const latestVersion = result.versions.filter((obj: any) => {
    return obj.version === latestVersionNumber;
  });
  const oldMapping = latestVersion[0].datasetsMapping[0];
  const newMapping = manifest.datasetsMapping[0];

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
  let ignore = ['**/*/node_modules/**/*', 'node_modules/**/*'];
  const userIgnore = manifest.ignore;
  if (userIgnore) {
    if (userIgnore instanceof Array) {
      ignore = ignore.concat(userIgnore);
    } else {
      log.fail('The manifest.json `ignore` property must be an Array');
    }
  }
  const badFileList = globSync('**/*', {ignore: ignore}).filter(file => {
    console.log(file);
    // Normalize path separators to forward slashes for cross-platform compatibility
    const normalizedFile = file.replace(/\\/g, '/');
    return (
      // special characters except "/" in file names are not allowed
      /[~`!#$%^&*+=[\]\\';,{}|\\":<>?]/g.test(normalizedFile) ||
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

const recreateDesign = async (domo: any, manifest: Manifest) => {
  const choice = await createSelect(
    'This design has been deleted. Would you like to undelete this design and publish to it, or create a new design with these assets?',
    ['Undelete', 'Create New Design'],
  );

  if (choice === 'Create New Design') {
    manifest.id = null;
    createDesign(domo, manifest);
  } else if (choice === 'Undelete') {
    try {
      await domo.unDeleteDesign(manifest.id);
      publishAssets(domo, manifest);
    } catch (err) {
      log.fail('Error undeleting design');
      console.error(err);
    }
  } else {
    log.ok('Exited without republishing design');
  }
};

const publishErrors = async (e: any, domo: any, manifest: Manifest) => {
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
    const shouldCreate = await createConfirm(
      'This design does not exist on ' +
        domo.getInstance() +
        '. Would you like to create a new design with these assets?',
      true,
    );

    if (shouldCreate) {
      manifest.id = null;
      createDesign(domo, manifest);
    }
  } else if (e.message && e.message.startsWith('DA')) {
    switch (e.message.substr(0, 6)) {
      case 'DA0086':
        log.warn(e.message);
        const shouldRecreate = await createConfirm(
          'This design has been deleted. Would you like to publish a new design with these assets?',
          true,
        );

        if (shouldRecreate) {
          manifest.id = null;
          createDesign(domo, manifest);
        }

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

const publishAssets = (domo: any, manifest: Manifest) => {
  return domo
    .uploadAllAssets(manifest)
    .then((files: any) => {
      log.ok(
        'Publishing ' +
          manifest.name +
          ' to ' +
          domo.getInstance() +
          ' on ' +
          new Date(),
      );
      logUploadSuccess(files as any);
    })
    .catch((e: any) => {
      publishErrors(e, domo, manifest);
    });
};
