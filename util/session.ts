import { OptionsWithUrl } from 'request-promise';
import * as Promise from 'bluebird';
import log = require('./log');
import Domo = require('ryuu-client');

module.exports = {
  check: function(domo: Domo){
    return new Promise(function(resolve, reject){
      var options: OptionsWithUrl = {
        url: 'https://' + domo.getInstance() + '/auth/validate',
        method: 'GET',
        resolveWithFullResponse: true
      };

      domo.processRequest(options)
        .then(function(res) {
          try{
            //@ts-ignore
            var isValid = JSON.parse(res.body).isValid;
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
