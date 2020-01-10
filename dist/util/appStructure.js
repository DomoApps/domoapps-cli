"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var path = require('path');
function hasThumbnail() {
    try {
        return fs.statSync(path.join(process.cwd(), 'thumbnail.png')).isFile();
    }
    catch (ignore) {
        return false;
    }
}
exports.hasThumbnail = hasThumbnail;
;
//# sourceMappingURL=appStructure.js.map