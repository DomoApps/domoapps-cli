import {ManifestUtils} from '../util/manifest';
import {log} from '../util/log';
import validator from 'validator';

/**
 * Takes up to two args to check for a valid design id and gives priority to
 * the first argument
 * @param  {String} arg1 designId arg that will take priority if both args
 * are defined and valid
 * @param  {String} man object defining the program manifest of the current
 * context
 * @return {String}      Returns id with this priority: arg1, arg2,
 * manifest.id, null
 * @return {void} Returns void with an error log.
 */
export function getDesignId(id?: string, manifestPath?: string) {
  if (id) {
    if (!validator.isUUID(id)) {
      log.fail(`The argument ${id} is not a valid design ID`);
      return;
    }
  } else {
    const manifest = ManifestUtils.get(manifestPath);
    if (!manifest || !manifest.id) {
      log.fail(
        'No manifest found. Please supply design id using -i or change to a directory with a valid manifest file',
      );
      return;
    }
    id = manifest.id;
  }

  return id;
}
