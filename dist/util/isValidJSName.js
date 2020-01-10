"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isValidJSName(name) {
    return name.match ? !name.match(/[^a-zA-Z\$\_\d]+/) : false;
}
exports.default = isValidJSName;
//# sourceMappingURL=isValidJSName.js.map