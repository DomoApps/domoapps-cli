module.exports = {
  checkResponse: function(res){
    expect(res).toBeNull();
  },
  fs: require('fs-extra'),
  Promise: require("bluebird"),
  request: require("bluebird").promisify(require("request"))
}