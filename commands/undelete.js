var validator = require('validator');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var log = require('../util/log');
var evoke = require('../util/evoke');

module.exports = function(program){
  program
    .command('undelete [arg]')
    .description('Undeletes a soft-deleted design')
    .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
    .action(function(arg, options) {

      var optionalArg = arg || null;
      var designId = options.design_id || null;

      if (designId) {
        if (!validator.isUUID(designId)) return log.fail('The value specified for option -i is not a valid design ID', designId);
      } else if (optionalArg) {
        return log.fail('Please supply option -i or --design_id when attempting to undelete design by id.');
      } else {
        var manifest = Manifest.get(program.manifest);
        if (!manifest || !manifest.id) return log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
        designId = manifest.id;
      }

      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);

      var domo = new Domo(login.instance, login.sid, login.devtoken);

      domo.unDeleteDesign(designId)
        .tap(evoke(log.ok, 'Undeleted design ' + designId))
        .catch(evoke(log.fail, 'Unable to undelete design ' + designId))
        .finally(process.exit)
    });
}
