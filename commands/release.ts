import {ManifestUtils} from '../util/manifest';
import {Login} from '../util/login';
import {log} from '../util/log';
import appStructure = require('../util/appStructure');
import {constant} from '../models/index';
import {Command} from 'commander';
import {createSelect} from '../util/prompts';

module.exports = (program: Command) => {
  program
    .command('release')
    .description('prepare a design for app store release')
    .action(() => {
      new Login().getClient().then(client => {
        const manifest = ManifestUtils.getManifest(
          program.opts().manifest,
          true,
        );

        // make sure app has been published first
        if (!manifest.id) {
          log.fail(
            'Cannot release until design is published.',
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
          .then(async versions => {
            versions.reverse();
            versions.unshift('latest');

            const version = await createSelect(
              'select a version to release',
              versions,
            );

            // release the kraken
            try {
              await client.release(manifest.id, version);
              log.ok('Design version (' + version + ') released');
            } catch (err) {
              log.fail('Error releasing design');
              console.error(err);
            }
          })
          .catch(() => log.clientRequestFailed('Error releasing app design'));
      });
    });
};
