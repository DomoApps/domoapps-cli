var fs = require('fs-extra');
var path = require('path');
var semver = require('semver');
var glob = require('glob');
var log = require('../util/log');
var isValidJSName = require('../util/isValidJSName');

module.exports = {
  /**
  * Get the local manifest.json file, ensuring it's valid.
  */
  get: function(manifestName = 'manifest.json', verify = true){
    const manifestPath = findManifest(manifestName);

    var manifest;
    try {
      manifest = fs.readFileSync(path.resolve(manifestPath));
    }
    catch (e){
      if (verify){
        return log.fail(`No ${manifestName} file in this directory`, `Please publish from a directory containing a Custom App design ${manifestName} file`);
      }
      else{
        return;
      }
    }

    try {
      manifest = JSON.parse(manifest);
    }
    catch (e){
      return log.fail(`Your ${manifestName} file is not valid JSON`, e.message);
    }
    if (verify){
      validateManifest(manifest);
    }

    // add the manifest name, so it's attached to the object
    manifest.name = manifestName;

    return manifest;
  },

  hasManifest: function(manifestName) {
    return fs.existsSync(findManifest(manifestName));
  },

  /**
   * update the manifest (in memory and on disk)
   */
  persistDesignId: function(design, manifest){
    manifest.id = design.id;
    this.updateManifest(manifest);
    return design;
  },

  updateManifest: function(manifest){
    const manifestPath = findManifest(manifest.name);
    fs.writeJsonSync(manifestPath, manifest, {spaces: 2});
  }
}

/**
* Validate the manifest file.
*/
function validateManifest(manifest){

  // validate manifest file for required fields
  requireProperty(manifest, 'name');
  requireProperty(manifest, 'version');

  // validate required mapping fields
  manifest.mapping.forEach(function(dataPoint){
    requireProperty(dataPoint, 'dataSetId');
    requireProperty(dataPoint, 'alias');
    requireProperty(dataPoint, 'fields');
    ensureValidAlias(dataPoint.alias);

    // validate dataPoint mapping fields
    dataPoint.fields.forEach(function(field){
      requireProperty(field, 'alias');
      requireProperty(field, 'columnName');
      ensureValidAlias(field.alias);
    });
  });

  // validate semver
  if (!semver.valid(manifest.version)){
    log.fail('Invalid version', 'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/');
  }

  function requireProperty(obj, prop){
    if (!obj[prop]){
      log.fail('Missing required property: ' + prop, 'Please add the missing `'+ prop +'` property to your manifest.json file.');
    }
  }

  return manifest;
}


/**
 * Alias must be a valid JS property
 */
function ensureValidAlias(name){
  if (!isValidJSName(name)){
    log.fail('Alias names must be valid JavaScript properties', 'Please rename the ' + JSON.stringify(name) + ' alias and update any /data/v1/<alias> calls with the new alias name');
  }
}

/**
 * Finds the manifest file in the current directory, or sub files
 */
function findManifest(name) {
  if (fs.existsSync(name)) {
    return name;
  }
  if (fs.existsSync(`public/${name}`)) {
    return `public/${name}`;
  }
  if (fs.existsSync(`src/${name}`)) {
    return `src/${name}`;
  }

  // find any matching files (one layer deep while ignoring .dist and build folders)
  const matches = glob.sync(
    `*/${name}`,
    {
      ignore: ['dist/*', 'build/*'],
    },
  );
  if (matches.length > 0) {
    return matches[0];
  }

  return name;
}
