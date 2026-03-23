import validator from 'validator';
import {ManifestUtils} from '../util/manifest.js';
import {Login} from '../util/login.js';
import {log} from '../util/log.js';
import {Command} from 'commander';

export default (program: Command) => {
  program
    .command('owner <add|rm|ls> [user-emails...]')
    .description('manage design owners')
    .option(
      '-i, --designId <id>',
      'Specify design ID, otherwise it is retrieved from a manifest file',
    )
    .action((action: string, users: string[], options) => {
      let designId: string;
      if (options.design_id) {
        designId = options.design_id;
        if (!validator.isUUID(designId))
          return log.fail(
            'The value specified for option -i is not a valid design ID',
            designId,
          );
      } else {
        const manifest = ManifestUtils.getManifest(program.opts().manifest);
        if (!manifest)
          return log.fail(
            'No manifest found. Please supply design id using -i or change to a directory with a valid manifest file',
          );
        if (!manifest.id)
          return log.fail(
            'No manifest id. Please publish your design before attempting to add owners to it.',
          );
        designId = manifest.id;
      }
      new Login().getClient().then(client => {
        switch (action) {
          case 'add':
            if (users) {
              client
                .addOwners(designId, users)
                .then(() => log.ok('Owners added ' + users))
                .catch(() => log.fail('Error adding owners'));
            }
            break;
          case 'rm':
            if (users) {
              client
                .removeOwners(designId, users)
                .then(() => log.ok('Owners removed ' + users))
                .catch(() => log.fail('Error removing owners'));
            }
            break;
          case 'ls':
            client
              .getDesign(designId, {parts: 'owners'})
              .then(designs => {
                log.ok(`Owners for design ${designId}:`);
                designs.owners.forEach(owner => {
                  console.log('\t' + owner.displayName);
                });
              })
              .catch(() => log.fail('Error retrieving owners'));
            break;
        }
      });
    });
};
