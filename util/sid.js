var querystring = require('querystring');

module.exports = {
  parse: function(sid){
    try{
      return JSON.parse(new Buffer(querystring.unescape(sid), 'base64'));
    }
    catch (e) {
      return {};
    }
  }
}
