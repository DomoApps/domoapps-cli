import validator from 'validator';
import Domo = require('ryuu-client');
import { Manifest } from  '../util/manifest';
import { Login } from '../util/login';
import { log } from'../util/log';
import { Command } from 'commander';

module.exports = function(program: Command){
  program
    .command('owner <add|rm|ls> [user-emails]')
    .description('manage design owners')
    .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
    .action(function(action: string, users: string[], options) {

      let designId: string;
      if (options.design_id) {
        designId = options.design_id;
        if (!designId || !validator.isUUID(designId)) return log.fail('The value specified for option -i is not a valid design ID', designId);
      } else {
        var manifest = Manifest.get();
        if (!manifest) return log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
        if (!manifest.id) return log.fail('No manifest id. Please publish your design before attempting to add owners to it.');
        designId = manifest.id;
      }

      Login.getMostRecentLogin().then(function(domo) {
        switch(action) {
          case 'add':
            if (users) {
              domo.addOwners(designId, users)
                .tap(() => log.ok('Owners added ' + users))
                .catch(() => log.fail('Error adding owners'))
                .finally(process.exit);
            }
            break;
          case 'rm':
            if (users) {
              domo.removeOwners(designId, users)
                .tap(() => log.ok('Owners removed ' + users))
                .catch(() => log.fail('Error removing owners'))
                .finally(process.exit);
            }
            break;
          case 'ls':
            domo.getOwners(designId)
              .tap(function listUsers(res: string[]) {
                res.sort();
                log.ok("Owners for design " + designId);
                res.forEach(function(element, index, array) {
                  console.log("\t" + element);
                });
              })
              .catch(() => log.fail('Error retrieving owners'))
              .finally(process.exit);
            break;
        }
      }).catch(log.notAuthenticated);
    });
}
