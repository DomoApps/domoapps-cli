'use strict';
var fs = require('fs');
var path = require('path');
/**
 * @return {Boolean}
 */
function hasThumbnail() {
    try {
        return fs.statSync(path.join(process.cwd(), 'thumbnail.png')).isFile();
    }
    catch (ignore) {
        return false;
    }
}
module.exports = { hasThumbnail: hasThumbnail };
//# sourceMappingURL=appStructure.js.map