import fs = require('fs-extra');
import path = require('path');
import semver = require('semver');
import glob = require('glob');
import { log } from '../util/log';
import isValidJSName from '../util/isValidJSName';
import { manifest } from '../models';
import { DesignVersion } from 'ryuu-client/models/interfaces/domoappstypes';

export class Manifest {
  /**
  * Get the local manifest.json file, ensuring it's valid.
  */
  static get(manifestName = 'manifest.json', verify = true) {
    const manifestPath = findManifest(manifestName);

    let rawmanifest: Buffer;
    try {
      rawmanifest = fs.readFileSync(path.resolve(manifestPath));
    }
    catch (e){
      if (verify){
        log.fail(`No ${manifestName} file in this directory`, `Please publish from a directory containing a Custom App design ${manifestName} file`);
      }
      else{
        return;
      }
    }
    let manifest: manifest;
    try {
      manifest = JSON.parse(rawmanifest.toString());
    }
    catch (e){
      log.fail(`Your ${manifestName} file is not valid JSON`, e.message);
    }
    if (verify){
      validateManifest(manifest);
    }

    // add the manifest name, so it's attached to the object
    manifest.fileName = manifestName;
    /*
    waiting to deploy below line until I have time to refactor oauth
    log.info(`Getting manifest located in ${ path.resolve(manifestPath) }`)
    */
    return manifest;
  }

  static hasManifest(manifestName: string) {
    return fs.existsSync(findManifest(manifestName));
  }

  /**
   * update the manifest (in memory and on disk)
   */
  static persistDesignId(design: DesignVersion, manifest: manifest) {
    manifest.id = design.id;
    this.updateManifest(manifest);
    return design;
  }

  static updateManifest(manifest: manifest) {
    const manifestPath = findManifest(manifest.fileName);
    fs.writeJsonSync(manifestPath, manifest, {spaces: 2});
  }
}

/**
* Validate the manifest file.
*/
function validateManifest(manifest: manifest) {

  // validate manifest file for required fields
  requireProperty(manifest, 'name');
  requireProperty(manifest, 'version');
  requireProperty(manifest, 'mapping');

  // validate required mapping fields
  manifest.mapping.forEach(function(dataPoint) {
    requireProperty(dataPoint, 'dataSetId');
    requireProperty(dataPoint, 'alias');
    requireProperty(dataPoint, 'fields');
    ensureValidAlias(dataPoint.alias);

    // validate dataPoint mapping fields
    dataPoint.fields.forEach(function(field) {
      requireProperty(field, 'alias');
      requireProperty(field, 'columnName');
      ensureValidAlias(field.alias);
    });
  });

  // validate semver
  if (!semver.valid(manifest.version)) {
    log.fail('Invalid version', 'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/');
  }

  function requireProperty(obj: Object, prop: string) {
    if (!obj[prop]){
      log.fail('Missing required property: ' + prop, 'Please add the missing `'+ prop +'` property to your manifest.json file.');
    }
  }

  return manifest;
}


/**
 * Alias must be a valid JS property
 */
function ensureValidAlias(name: string) {
  if (!isValidJSName(name)){
    log.fail('Alias names must be valid JavaScript properties', 'Please rename the ' + JSON.stringify(name) + ' alias and update any /data/v1/<alias> calls with the new alias name');
  }
}

/**
 * Finds the manifest file in the current directory, or sub files
 */
function findManifest(name: string) {
  if (fs.existsSync(name)) {
    return name;
  }
  if (fs.existsSync(`public/${name}`)) {
    return `public/${name}`;
  }
  if (fs.existsSync(`src/${name}`)) {
    return `src/${name}`;
  }

  // find any matching files (one layer deep while ignoring dist, templates and build folders)
  const matches = glob.sync(
    `*/${name}`,
    {
      ignore: ['dist/*', 'build/*', 'templates/*'],
    },
  );
  if (matches.length > 0) {
    return matches[0];
  }

  return name;
}
