var validator = require('validator');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var log = require('../util/log');
var evoke = require('../util/evoke');


module.exports = function(program){
  program
    .command('delete')
    .description('Deletes a published design')
    .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
    .option('-f, --force', 'Delete the design even if it is referenced by Custom Apps')
    .action(function(options) {

      var designId;
      if (options.design_id) {
        designId = options.design_id;
        if (!designId || !validator.isUUID(designId)) return log.fail('The value specified for option -i is not a valid design ID', designId);
      } else {
        var manifest = Manifest.get(program.manifest);
        if (!manifest || !manifest.id) return log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
        designId = manifest.id;
      }

      var force = false;
      if (options.force) force = true;

      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);

      var domo = new Domo(login.instance, login.sid, login.devtoken);

      domo.deleteDesign(designId, force)
        .tap(evoke(log.ok, 'Deleted design ' + designId))
        .catch(evoke(log.fail, 'Unable to delete design ' + designId))
        .finally(process.exit)
    });
}
