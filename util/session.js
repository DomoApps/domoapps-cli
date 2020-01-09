var request = require('request');
var Promise = require('bluebird');
var evoke = require('./evoke');
var log = require('./log');
var Domo = require('ryuu-client');

module.exports = {
  check: function(domo){
    return new Promise(function(resolve, reject){
      var options = {
        url: 'https://' + domo.instance + '/auth/validate',
        method: 'GET',
        resolveWithFullResponse: true
      };

      domo.processRequest(options)
        .then(function(res) {
          try{
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
};
