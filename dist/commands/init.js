var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var inquirer = require("inquirer");
var _ = require('lodash');
var isValidJSName = require('../util/isValidJSName');
var slug = require('slug');
var chalk = require('chalk');
var shell = require('shelljs');
var async = require('async/reduce');
var fs = require('fs-extra');
var path = require('path');
var log = require('../util/log');
var multichoice = require('../util/multichoice');
module.exports = function (program) {
    program
        .command('init')
        .description('initialize a new Custom App design')
        .action(function () {
        inquirer.prompt([
            {
                type: 'input',
                message: 'design name',
                name: 'name'
            },
            multichoice({
                type: 'list',
                message: 'select a starter',
                name: 'starter',
                choices: ['hello world', 'manifest only', 'basic chart', 'map chart']
            })
        ])
            .then(function (answers) {
            // answers.list = multichoice.answer(answers.list);
            answers.datasources = [];
            askDatasource(answers, function (allAnswers) {
                var files;
                var dirs;
                var step = 0;
                var nextStepsMessage = 'Next steps: \n';
                if (allAnswers.starter === 'manifest only') {
                    files = ['manifest.json'];
                    dirs = [null];
                }
                else if (allAnswers.starter === 'hello world') {
                    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js'];
                    dirs = [null, null, null, null, null];
                    var dirname = slug(answers.name);
                    nextStepsMessage += stepNumber() + " " + chalk.cyan('cd') + " into the " + chalk.green(dirname) + " directory\n";
                    shell.mkdir('-p', dirname);
                    process.chdir(path.resolve(dirname));
                }
                else if (allAnswers.starter === 'basic chart') {
                    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenix.js'];
                    var customChartTemplateDir_1 = path.join(__dirname, '/../templates/', 'basic chart/');
                    dirs = __spreadArrays(new Array(files.length)).map(function (_) { return customChartTemplateDir_1; });
                    var dirname = slug(answers.name);
                    nextStepsMessage += stepNumber() + " " + chalk.cyan('cd') + " into the " + chalk.green(dirname) + " directory\n";
                    shell.mkdir('-p', dirname);
                    process.chdir(path.resolve(dirname));
                }
                else if (allAnswers.starter === 'map chart') {
                    files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenixWithMaps.js'];
                    var customChartTemplateDir_2 = path.join(__dirname, '/../templates/', 'map chart/');
                    dirs = __spreadArrays(new Array(files.length)).map(function (_) { return customChartTemplateDir_2; });
                    var dirname = slug(answers.name);
                    nextStepsMessage += stepNumber() + " " + chalk.cyan('cd') + " into the " + chalk.green(dirname) + " directory\n";
                    shell.mkdir('-p', dirname);
                    process.chdir(path.resolve(dirname));
                }
                // populate and write out the template files
                writeFilesIfNonexistent(files, dirs, allAnswers, function (err, res) {
                    if (err) {
                        log.fail('Cannot initialize new design. Doing so would overwrite existing files:' + err);
                    }
                    else {
                        nextStepsMessage += stepNumber() + " Edit the files that were just generated. \n" + stepNumber() + " Run " + chalk.cyan('domo login') + " if you haven't already. \n" + stepNumber() + " Run " + chalk.cyan('domo publish') + " whenever you make changes. \n" + stepNumber() + " Add a Custom App card to any page in Domo. ";
                        log.ok("New design initialized in the " + chalk.green(dirname || 'current') + " directory", nextStepsMessage);
                    }
                    if (allAnswers.starter === 'hello world') {
                        fs.remove('node_modules');
                    }
                    process.exit();
                });
                /**
                 * Add an incrementing step to the instructions message
                 */
                function stepNumber() {
                    step++;
                    return step + ".";
                }
            });
        });
    });
};
// recursively ask user to enter all their datasources
function askDatasource(currentAnswers, callback) {
    inquirer.prompt([
        {
            type: 'confirm',
            message: currentAnswers.datasources.length > 0 ? 'add another dataset?' : 'would you like to connect to any datasets?',
            name: 'askDatasource'
        }
    ]).then(function (answers) {
        if (answers.askDatasource) {
            addDatasource(_.merge(currentAnswers, answers), function (combinedAnswers) {
                // ask for more datasources
                askDatasource(combinedAnswers, callback);
            });
        }
        else {
            // all done with datasources, continue on.
            callback(_.merge(currentAnswers, answers));
        }
    });
}
function addDatasource(currentAnswers, callback) {
    inquirer.prompt([
        {
            type: 'input',
            message: 'dataset id',
            name: 'id'
        },
        {
            type: 'input',
            message: 'dataset alias',
            name: 'alias',
            validate: function (name) {
                if (!isValidJSName(name))
                    return 'Alias must be a valid JavaScript property';
                return true;
            }
        }
    ]).then(function (datasource) {
        currentAnswers.datasources.push(datasource);
        callback(currentAnswers);
    });
}
function writeFilesIfNonexistent(files, dirs, allAnswers, callback) {
    async.reduce(files, [], function (filesThatExist, file, reduceCallback) {
        fs.open(file, 'r', function (err, fd) {
            var fileExists = !err;
            if (fileExists) {
                fs.closeSync(fd);
                filesThatExist.push(file);
            }
            reduceCallback(null, filesThatExist);
        });
    }, function (err, filesThatExist) {
        if (filesThatExist.length > 0) {
            callback(filesThatExist, null);
        }
        else {
            _.zip(files, dirs).forEach(writeTemplateFile);
            callback(null, files);
        }
    });
    function writeTemplateFile(filedir) {
        var file = filedir[0];
        var dir = filedir[1];
        dir = dir || (__dirname + '/../templates/');
        var contents = _.template(fs.readFileSync(path.resolve(dir + file)))(allAnswers);
        fs.writeFileSync(process.cwd() + '/' + file, contents);
    }
}
//# sourceMappingURL=init.js.map