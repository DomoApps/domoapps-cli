module.exports = function isValidJSName(name){
  return !name.match(/[^a-zA-Z\$\_\d]+/);
}
