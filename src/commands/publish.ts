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
import type {Asset, Design, Manifest, RyuuClient} from 'ryuu-client';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
};

// Enquirer rejects (with an empty value) when the user cancels with Ctrl-C.
const promptOrCancel = async <T>(
  ask: () => Promise<T>,
): Promise<T | undefined> => {
  try {
    return await ask();
  } catch {
    return undefined;
  }
};

const getStatusCode = (error: unknown): number | undefined => {
  return isRecord(error) && typeof error.statusCode === 'number'
    ? error.statusCode
    : undefined;
};

export default (program: Command) => {
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .option(
      '-d, --build-dir <path>',
      'path to build directory containing the app files',
    )
    .action(async options => {
      const manifest: Manifest = ManifestUtils.getManifest(
        program.opts().manifest,
        true,
      );

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

      let client: RyuuClient;
      try {
        client = await new Login().getClient();
      } catch (error) {
        log.notAuthenticated(getErrorMessage(error) || 'unknown error');
        return;
      }

      if (client.refreshToken === undefined) {
        log.notAuthenticated();
      }
      checkFileNames(manifest);

      if (!manifest.id) {
        await createDesign(client, manifest, options);
        return;
      }

      try {
        const result = await client.designs.get(manifest.id, {
          parts: 'versions',
        });
        checkMapping(result, manifest);
        await publishAssets(client, manifest);
      } catch (error) {
        await publishErrors(error, client, manifest, options);
        return;
      }
      await linkToDomoWeb(options, client, manifest);
    });
};

const createDesign = async (
  domo: RyuuClient,
  manifest: Manifest,
  options?: PublishCommandOptions,
) => {
  let designId: string;
  try {
    const designResult = await domo.designs.create(manifest);
    designId = designResult.id;
  } catch (error) {
    log.fail(
      log.handleErrorMessage(error, 'Error when creating new design'),
      undefined,
      error,
    );
    return;
  }
  log.ok('New design created on ' + domo.instance);

  // The design now exists remotely; keep the original fail-and-stop behavior
  // but report accurately so the user can add the id by hand.
  try {
    ManifestUtils.persistDesignId(designId, manifest);
  } catch (error) {
    log.fail(
      `Design ${designId} was created, but its id could not be saved to manifest.json: ${getErrorMessage(error)}`,
      `Add "id": "${designId}" to your manifest.json manually, or the next publish will create a duplicate design.`,
    );
    return;
  }
  const publishedManifest = {...manifest, id: designId};

  try {
    const files = await domo.assets.uploadAll(publishedManifest);
    logUploadSuccess(files);
  } catch (error) {
    log.fail(
      log.handleErrorMessage(
        error,
        'Error uploading assets in uploading assets for a new design',
      ),
      undefined,
      error,
    );
    return;
  }
  await linkToDomoWeb(options, domo, publishedManifest);
};

const logUploadSuccess = (files: Asset[]) => {
  files.forEach(file => {
    log.ok('Uploaded: ' + file.path);
  });
};

const linkToDomoWeb = async (
  options: PublishCommandOptions | undefined,
  domo: RyuuClient,
  manifest: Manifest,
) => {
  console.log(
    'Design can be found at https://' +
      domo.instance +
      '/assetlibrary?designId=' +
      manifest.id,
  );
  if (options && options.go) {
    try {
      await open(
        'https://' + domo.instance + '/assetlibrary?designId=' + manifest.id,
      );
    } catch (error) {
      log.warn(
        'Could not open the browser: ' + getErrorMessage(error),
        'Use the link above to view the design.',
      );
    }
  }
};

const checkMapping = (result: Design, manifest: Manifest) => {
  const latestVersionNumber = result.latestVersion;
  const latestVersion = result.versions?.filter(obj => {
    return obj.version === latestVersionNumber;
  });
  // This check only warns, so a missing mapping must never throw.
  const oldMapping = latestVersion?.[0]?.datasetsMapping?.[0];
  const newMapping = manifest.datasetsMapping?.[0];

  if (oldMapping) {
    Reflect.deleteProperty(oldMapping, 'dql');
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

const recreateDesign = async (
  domo: RyuuClient,
  manifest: Manifest,
  options?: PublishCommandOptions,
) => {
  const choice = await promptOrCancel(() =>
    createSelect(
      'This design has been deleted. Would you like to undelete this design and publish to it, or create a new design with these assets?',
      ['Undelete', 'Create New Design'],
    ),
  );

  if (choice === 'Create New Design') {
    manifest.id = null;
    await createDesign(domo, manifest, options);
  } else if (choice === 'Undelete') {
    try {
      await domo.designs.undelete(manifest.id);
    } catch (err) {
      log.fail('Error undeleting design', undefined, err);
      return;
    }

    try {
      await publishAssets(domo, manifest);
    } catch (error) {
      await publishErrors(error, domo, manifest, options);
      return;
    }
    await linkToDomoWeb(options, domo, manifest);
  } else {
    log.ok('Exited without republishing design');
  }
};

const publishErrors = async (
  error: unknown,
  domo: RyuuClient,
  manifest: Manifest,
  options?: PublishCommandOptions,
) => {
  const message = getErrorMessage(error);
  const statusCode = getStatusCode(error);

  if (statusCode === 400 && !message.startsWith('DA')) {
    log.fail('Design failed to publish with error:', message);
  } else if (statusCode === 401) {
    log.notAuthenticated(domo.refreshToken);
  } else if (statusCode === 403) {
    log.fail(
      'You do not have access to the design with id ' +
        manifest.id +
        ' on ' +
        domo.instance +
        '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.' +
        '\nAlternatively, you may have inadvertently changed the design id.',
    );
  } else if (message.substr(0, 23) == 'Design has been deleted') {
    await recreateDesign(domo, manifest, options);
  } else if (message.substr(0, 15) == 'No design found') {
    const shouldCreate = await promptOrCancel(() =>
      createConfirm(
        'This design does not exist on ' +
          domo.instance +
          '. Would you like to create a new design with these assets?',
        true,
      ),
    );

    if (shouldCreate) {
      manifest.id = null;
      await createDesign(domo, manifest, options);
    }
  } else if (message.startsWith('DA')) {
    switch (message.substr(0, 6)) {
      case 'DA0086': {
        log.warn(message);
        const shouldRecreate = await promptOrCancel(() =>
          createConfirm(
            'This design has been deleted. Would you like to publish a new design with these assets?',
            true,
          ),
        );

        if (shouldRecreate) {
          manifest.id = null;
          await createDesign(domo, manifest, options);
        }

        break;
      }
      default:
        // Pass on error messages that aren't in the set of documented errors.
        log.fail(message);
        break;
    }
  } else {
    //Error uploading assets
    log.fail(
      log.handleErrorMessage(
        error,
        'Error uploading assets in the upload all assets',
      ),
      undefined,
      error,
    );
  }
};

const publishAssets = async (
  domo: RyuuClient,
  manifest: Manifest,
): Promise<void> => {
  const files = await domo.assets.uploadAll(manifest);
  log.ok(
    'Publishing ' +
      manifest.name +
      ' to ' +
      domo.instance +
      ' on ' +
      new Date(),
  );
  logUploadSuccess(files);
};
