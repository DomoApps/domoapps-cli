"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var log = /** @class */ (function () {
    function log() {
    }
    /**
     * log a success
     */
    log.ok = function (msg, submessage) {
        console.log(chalk_1.default.green('\u2713'), msg);
        if (submessage) {
            console.log(chalk_1.default.gray(submessage));
        }
    };
    /**
     * log info
     */
    log.info = function (msg, submessage) {
        console.log(chalk_1.default.cyan(msg));
        if (submessage) {
            console.log(chalk_1.default.gray(submessage));
        }
    };
    /**
     * log warning
     */
    log.warn = function (msg, submessage) {
        console.log(chalk_1.default.yellow(msg));
        if (submessage) {
            console.log(chalk_1.default.gray(submessage));
        }
    };
    /**
     * log an error and exit node
     */
    log.fail = function (msg, submessage, result) {
        console.log(chalk_1.default.red('X'), msg);
        if (submessage) {
            console.log(chalk_1.default.gray(submessage));
        }
        if (result && result.message) {
            console.log(chalk_1.default.gray(result.message));
        }
        if (process.argv.indexOf("verbose") !== -1) {
            console.log(chalk_1.default.red("statusCode:"), result.statusCode);
            console.log(chalk_1.default.red("method:"), result.method);
            console.log(chalk_1.default.red("path:"), result.url);
            console.log(chalk_1.default.red("failureMessage:"), result.failureMessage);
        }
        process.exit(1);
    };
    log.notAuthenticated = function (refreshToken) {
        if (!refreshToken) {
            module.exports.fail('Not authenticated', 'Please login using "domo login"');
        }
        else if (refreshToken) {
            module.exports.fail('Not authenticated', 'Your refresh token may have been revoked. Please login again with "domo login".');
        }
        else {
            module.exports.fail('Not authenticated');
        }
    };
    // ERR SHOULD BE AN ERROR?
    log.clientRequestFailed = function (err, failureMessage) {
        var message = "You are not authenticated or your refresh token may have been revoked. Please login again with \"domo login\"";
        if (failureMessage) {
            message = failureMessage;
        }
        module.exports.fail(err, message);
    };
    log.handleErrorMessage = function (err, label) {
        label = label || 'Error sending request';
        //const toe = err && err.res && err.res.body;
        return label; //+ toe
    };
    return log;
}());
exports.log = log;
//# sourceMappingURL=log.js.map