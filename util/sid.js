var querystring = require('querystring');

module.exports = {
  parse: function(sid){
    return JSON.parse(new Buffer(querystring.unescape(sid), 'base64'));
  }
}
