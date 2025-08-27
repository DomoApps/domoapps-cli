import fs = require('fs-extra');
import path = require('path');
import semver = require('semver');
import glob = require('glob');
import {log} from '../util/log';
import isValidJSName from '../util/isValidJSName';
import {Manifest} from 'ryuu-client/lib/models';

/**
 * Get the local manifest.json file, ensuring it's valid.
 */
const getManifest = (manifestName = 'manifest.json', verifyValid = false) => {
  const manifestPath = findManifest(manifestName);

  let rawmanifest: Buffer;
  try {
    rawmanifest = fs.readFileSync(path.resolve(manifestPath));
  } catch (e) {
    if (verifyValid) {
      log.fail(
        `No ${manifestName} file in this directory`,
        `Please publish from a directory containing a Custom App design ${manifestName} file`,
      );
    } else {
      return;
    }
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(rawmanifest.toString());
  } catch (e) {
    log.fail(`Your ${manifestName} file is not valid JSON`, e.message);
  }

  // add the manifest name, so it's attached to the object
  manifest.fileName = manifestName;

  if (verifyValid) {
    manifest = updateManifestProperties(manifest);
    validateManifest(manifest);
  }

  /*
    waiting to deploy below line until I have time to refactor oauth
    log.info(`Getting manifest located in ${ path.resolve(manifestPath) }`)
    */
  return manifest;
};

const hasManifest = (manifestName: string) => {
  return fs.existsSync(findManifest(manifestName));
};

/**
 * update the manifest (in memory and on disk)
 */
const persistDesignId = (id: string, manifest: Manifest) => {
  const newManifest = {...manifest, id};
  updateManifest(newManifest);
  return id;
};

const updateManifest = (manifest: Manifest) => {
  const manifestPath = findManifest(manifest.fileName);
  fs.writeJsonSync(manifestPath, manifest, {spaces: 2});
};

/**
 * Validate the manifest file.
 */
const validateManifest = (manifest: Manifest) => {
  // validate manifest file for required fields
  requireProperty(manifest, 'name');
  requireProperty(manifest, 'version');
  // validate semver
  if (!semver.valid(manifest.version)) {
    log.fail(
      'Invalid version',
      'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/',
    );
  }
  return manifest;
};

const requireProperty = (obj: Object, prop: string) => {
  if (!obj[prop]) {
    log.fail(
      'Missing required property: ' + prop,
      'Please add the missing `' +
        prop +
        '` property to your manifest.json file.',
    );
  }
};

const updateManifestProperties = (manifest: Manifest) => {
  const updatedManifest = {...manifest};

  if (updatedManifest.hasOwnProperty('mapping')) {
    updatedManifest.datasetsMapping = updatedManifest.mapping;
    delete updatedManifest.mapping;
  } else if (!updatedManifest.hasOwnProperty('datasetsMapping')) {
    updatedManifest.datasetsMapping = [];
  }

  if (updatedManifest.hasOwnProperty('collections')) {
    updatedManifest.collectionsMapping = updatedManifest.collections;
    delete updatedManifest.collections;
  }

  if (updateManifest.hasOwnProperty('appContextId')) {
    updatedManifest.proxyId = updatedManifest['appContextId'];
    delete updatedManifest['appContextId'];
  } else if (updateManifest.hasOwnProperty('cardId')) {
    updatedManifest.proxyId = updatedManifest['cardId'];
    delete updatedManifest['cardId'];
  }

  updateManifest(updatedManifest);
  return updatedManifest;
};

/**
 * Alias must be a valid JS property
 */
function ensureValidAlias(name: string) {
  if (!isValidJSName(name)) {
    log.fail(
      'Alias names must be valid JavaScript properties',
      'Please rename the ' +
        JSON.stringify(name) +
        ' alias and update any /data/v1/<alias> calls with the new alias name',
    );
  }
}

/**
 * Finds the manifest file in the current directory, or sub files
 */
const findManifest = (name: string) => {
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
  const matches = glob.sync(`*/${name}`, {
    ignore: ['dist/*', 'build/*', 'templates/*'],
  });
  if (matches.length > 0) {
    return matches[0];
  }

  return name;
};

export const ManifestUtils = {
  getManifest,
  hasManifest,
  persistDesignId,
  updateManifest,
  updateManifestProperties,
  findManifest,
};
