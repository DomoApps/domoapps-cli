var fs = require('fs-extra');
var path = require('path');
var extract = require('extract-zip');
var inquirer = require('inquirer');
var shell = require('shelljs');
var Login = require('../util/login');
var Domo = require('ryuu-client');
var log = require('../util/log');
var constants = require('../util/constants');
module.exports = function (program) {
    program
        .command('download')
        .description('download a Custom App design')
        .option('-i, --design-id <id>', 'design id')
        .option('-d, --design-version <design-version>', 'design version')
        .action(function (args) {
        Login.getMostRecentLogin().then(function (domo) {
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
                domo.download(answers.designId, answers.version).then(function (req) {
                    req.on('response', function (response) {
                        if (response.statusCode === 200) {
                            var regexp = /filename="(.*)"/;
                            var name = response.headers['content-disposition'].match(regexp)[1] || 'domoapp';
                        }
                        else {
                            log.fail('Design not found. Make sure you have the correct design id.');
                        }
                        var writeStream = fs.createWriteStream('./' + name + '.zip', { flags: 'w+', mode: 438 });
                        req.pipe(writeStream);
                        writeStream.on('finish', function () {
                            var source = path.resolve('./' + name + '.zip');
                            var target = path.resolve('./' + name);
                            extract(source, { dir: target }, function (err, results) {
                                if (!err) {
                                    shell.chmod('-R', 'u+w', target);
                                    fs.remove(source);
                                    process.exit();
                                }
                            });
                        });
                    });
                })
                    .catch(log.clientRequestFailed('Unable to download design ' + answers.designId));
            });
        }).catch(log.notAuthenticated);
    });
};
//# sourceMappingURL=download.js.map