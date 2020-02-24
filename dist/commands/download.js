"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs-extra");
var path = require("path");
var extract = require("extract-zip");
var inquirer = require("inquirer");
var shell = require("shelljs");
var login_1 = require("../util/login");
var log_1 = require("../util/log");
module.exports = function (program) {
    program
        .command('download')
        .description('download a Custom App design')
        .option('-i, --design-id <id>', 'design id')
        .option('-d, --design-version <design-version>', 'design version')
        .action(function (args) {
        login_1.Login.getMostRecentLogin().then(function (domo) {
            var prompts = [];
            if (!args.designId) {
                prompts.push({
                    type: 'input',
                    message: 'design id',
                    name: 'designId'
                });
            }
            if (!args.designVersion) {
                prompts.push({
                    type: 'input',
                    message: 'version',
                    name: 'version',
                    default: 'latest'
                });
            }
            inquirer.prompt(prompts)
                .then(function (answers) {
                answers.designId = args.designId || answers.designId;
                answers.version = args.designVersion || answers.version;
                domo.download(answers['designId'], answers['version']).then(function (req) {
                    req.on('response', function (response) {
                        if (response.statusCode === 200) {
                            var regexp = /filename="(.*)"/;
                            var name = response.headers['content-disposition'].match(regexp)[1] || 'domoapp';
                        }
                        else {
                            log_1.log.fail('Design not found. Make sure you have the correct design id.');
                        }
                        var writeStream = fs.createWriteStream('./' + name + '.zip', { flags: 'w+', mode: 438 });
                        req.pipe(writeStream);
                        writeStream.on('finish', function () {
                            var source = path.resolve('./' + name + '.zip');
                            var target = path.resolve('./' + name);
                            extract(source, { dir: target }, function (err) {
                                if (!err) {
                                    shell.chmod('-R', 'u+w', target);
                                    fs.remove(source);
                                    process.exit();
                                }
                            });
                        });
                    });
                })
                    .catch(function () { return log_1.log.clientRequestFailed('Unable to download design ' + answers.designId); });
            });
        }).catch(log_1.log.notAuthenticated);
    });
};
//# sourceMappingURL=download.js.map