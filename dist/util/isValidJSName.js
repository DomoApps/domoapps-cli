module.exports = function isValidJSName(name) {
    return name.match ? !name.match(/[^a-zA-Z\$\_\d]+/) : false;
};
//# sourceMappingURL=isValidJSName.js.map