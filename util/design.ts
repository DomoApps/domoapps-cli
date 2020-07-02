import { Manifest } from '../util/manifest';
import { log } from '../util/log';
import validator from 'validator';

/**
 * Takes up to two args to check for a valid design id and gives priority to
 * the first argument
 * @param  {String} arg1 designId arg that will take priority if both args
 * are defined and valid
 * @param  {String} arg2 designId arg that will be the fallback if the first
 * arg is null or undefined
 * @param  {String} man object defining the program manifest of the current
 * context
 * @return {String}      Returns id with this priority: arg1, arg2,
 * manifest.id, null
 * @return {void} Returns void with an error log.
 */
export function getDesignId(arg1: string, arg2: string, man: string) {
  let id = arg1 || arg2;

  if (id) {
    if (!validator.isUUID(id)) 
      {
        log.fail('The value specified for option -i is not a valid design ID', id);
        return;
      }
  } else {
    const manifest = Manifest.get(man);
    if (!manifest || !manifest.id) {
      log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
      return;
    }
    id = manifest.id;
  }

  return id;
};

