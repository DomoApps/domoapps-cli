import fs = require('fs-extra');
import path = require('path');
import semver = require('semver');
import glob = require('glob');
import {log} from '../util/log';
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
 * Persists a design ID to the manifest both in memory and on disk
 * Returns the persisted ID for confirmation
 */
const persistDesignId = (id: string, manifest: Manifest): string => {
  // Validate inputs
  if (!id || typeof id !== 'string') {
    throw new Error('Design ID must be a non-empty string');
  }
  if (!manifest) {
    throw new Error('Manifest object is required');
  }

  // Create updated manifest with new ID
  const updatedManifest = {
    ...manifest,
    id: id.trim(), // Clean up the ID
  };

  // Persist to disk
  updateManifest(updatedManifest);

  // Return the persisted ID for confirmation
  return id.trim();
};

/**
 * Updates a manifest file on disk with the provided manifest object
 * Preserves JSON formatting with 2-space indentation
 * @param manifest The manifest object to write to disk
 * @throws Error if manifest is invalid or file cannot be written
 */
const updateManifest = (manifest: Manifest): void => {
  // Input validation
  if (!manifest) {
    throw new Error('Manifest object is required');
  }
  
  if (!manifest.fileName) {
    throw new Error('Manifest must have a fileName property');
  }

  // Resolve the manifest file location
  const manifestPath = findManifest(manifest.fileName);
  
  try {
    // Write manifest to disk with consistent formatting
    fs.writeJsonSync(manifestPath, manifest, {
      spaces: 2,
      EOL: '\n' // Ensure consistent line endings
    });
  } catch (error) {
    throw new Error(`Failed to write manifest to ${manifestPath}: ${error.message}`);
  }
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

/**
 * Validates that a required property exists on an object
 * @param obj The object to check
 * @param prop The property name to validate
 * @throws Error via log.fail if property is missing
 */
const requireProperty = (obj: Record<string, any>, prop: string): void => {
  if (!obj || typeof obj !== 'object' || !obj[prop]) {
    log.fail(
      'Missing required property: ' + prop,
      'Please add the missing `' +
        prop +
        '` property to your manifest.json file.',
    );
  }
};

/**
 * Updates manifest properties to current format, handling legacy property names
 * @param manifest The manifest to update
 * @returns The updated manifest with transformed properties
 */
const updateManifestProperties = (manifest: Manifest): Manifest => {
  // Use a more flexible type to handle legacy properties
  const input = manifest as any;
  const updatedManifest = {...manifest};

  // Transform legacy 'mapping' property to 'datasetsMapping'
  if (input.hasOwnProperty('mapping')) {
    updatedManifest.datasetsMapping = input.mapping;
    delete (updatedManifest as any).mapping;
  } else if (!updatedManifest.hasOwnProperty('datasetsMapping')) {
    updatedManifest.datasetsMapping = [];
  }

  // Transform legacy 'collections' property to 'collectionsMapping'
  if (input.hasOwnProperty('collections')) {
    updatedManifest.collectionsMapping = input.collections;
    delete (updatedManifest as any).collections;
  }

  // Transform legacy 'appContextId' to 'proxyId' (fixing the original bug)
  if (input.hasOwnProperty('appContextId')) {
    updatedManifest.proxyId = input.appContextId;
    delete (updatedManifest as any).appContextId;
  } else if (input.hasOwnProperty('cardId')) {
    // Transform legacy 'cardId' to 'proxyId' (fixing the original bug)
    updatedManifest.proxyId = input.cardId;
    delete (updatedManifest as any).cardId;
  }

  // Persist the updated manifest to disk
  updateManifest(updatedManifest);
  return updatedManifest;
};


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
