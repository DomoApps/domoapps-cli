var request = require('request');
var Promise = require('bluebird');

module.exports = {
  check: function(domo){
    return new Promise(function(resolve, reject){
      var options = {
        url: 'https://' + domo.instance + '/auth/validate',
        method: 'GET',
        headers: domo.getAuthHeader()
      };
      // for now assume dev tokens are still valid. Will want to verify once thats supported
      // https://git.empdev.domo.com/Development/apiData/issues/549
      if(domo.devtoken){
        resolve(true);
      }

      request(options, function(err, res){
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

    });
  }
}
