import { OptionsWithUrl } from 'request-promise';
import * as Bluebird from 'bluebird';
global.Promise = <any>Bluebird;
import { log } from './log';
import Domo = require('ryuu-client');
import { ProcessedMessage } from "../models/index";

export class Session {
  static check (domo: Domo) {
    return new Promise(function(resolve, reject){
      var options: OptionsWithUrl = {
        url: 'https://' + domo.getInstance() + '/auth/validate',
        method: 'GET',
        resolveWithFullResponse: true
      };

      domo.processRequest(options)
        .then(function(res: ProcessedMessage) {
          try{
            var isValid = JSON.parse(res.body.toString()).isValid;
            if(isValid){
              resolve(true);
            }
            else {
              reject(false);
            }
          }
          catch(e){
            // couldn't parse as JSON which means the service doesn't exist yet.
            // TODO: remove this once the /domoweb/auth/validate service has shipped to prod
            resolve(true);
          }
        })
        .catch(function(err){ 
          log.clientRequestFailed(err.statusCode + ' - ' + err.message, err.failureMessage);
        });
    });
  }
}
