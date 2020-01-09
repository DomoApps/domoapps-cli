"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
var _ = require("lodash");
var isValidJSName_1 = require("../util/isValidJSName");
var slug = require("slug");
var chalk_1 = require("chalk");
var shelljs_1 = require("shelljs");
var async_1 = require("async");
var fs = require("fs-extra");
var path = require("path");
var log = require("../util/log");
var multichoice_1 = require("../util/multichoice");
module.exports = function (program) {
    program
        .command('init')
        .option('--design_name <value>', 'Name of the design')
        .option('--starter <value>', 'Name of the starter kit')
        .option('--dataset <value>', 'Connect a dataset (y/n)')
        .description('initialize a new Custom App design')
        .action(function (options) {
        var prompts = [];
        if (!options.design_name) {
            prompts.push({
                type: 'input',
                message: 'design name',
                name: 'name'
            });
        }
        if (!options.starter) {
            prompts.push(multichoice_1.default({
                type: 'list',
                message: 'select a starter',
                name: 'starter',
                choices: ['hello world', 'manifest only', 'basic chart', 'map chart']
            }));
        }
        inquirer.prompt(prompts).then(function (answers) {
            if (options.design_name) {
                answers.name = options.design_name;
            }
            if (options.starter) {
                answers.starter = options.starter;
            }
            // answers.list = multichoice.answer(answers.list);
            answers.datasources = [];
            askDatasource(answers, options);
        });
    });
};
// recursively ask user to enter all their datasources
var askDatasource = function (currentAnswers, options) {
    if (!options.dataset) {
        inquirer.prompt([{
                type: 'confirm',
                message: currentAnswers.datasources.length > 0 ? 'add another dataset?' : 'would you like to connect to any datasets?',
                name: 'askDatasource'
            }])
            .then(function (answers) {
            if (answers.askDatasource) {
                addDatasource(_.merge(currentAnswers, answers))
                    .then(function (combinedAnswers) {
                    // ask for more datasources
                    askDatasource(combinedAnswers, options);
                }).catch(function (err) { console.log("why" + err); });
            }
            else {
                // all done with datasources, continue on.
                initiate(_.merge(currentAnswers, answers));
            }
        });
    }
    else {
        var answers = {
            askDatasource: false
        };
        initiate(_.merge(currentAnswers, answers));
    }
};
var addDatasource = function (currentAnswers) {
    return inquirer.prompt([{
            type: 'input',
            message: 'dataset id',
            name: 'id'
        },
        {
            type: 'input',
            message: 'dataset alias',
            name: 'alias',
            validate: function (name) {
                if (!isValidJSName_1.isValidJSName(name))
                    return 'Alias must be a valid JavaScript property';
                return true;
            }
        }
    ])
        //issue right here
        .then(function (datasource) {
        currentAnswers.datasources.push(datasource);
        //askDatasource(currentAnswers, {dataSource: true});
        return Promise.resolve(currentAnswers);
    });
};
var writeFilesIfNonexistent = function (files, dirs, allAnswers, callback) {
    async_1.reduce(files, [], function (filesThatExist, file, reduceCallback) {
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
            _.zip(files, dirs).forEach(writeTemplateFile.bind(this, allAnswers));
            callback(null, files);
        }
    });
};
var writeTemplateFile = function (allAnswers, filedir) {
    var file = filedir[0];
    var dir = filedir[1];
    dir = dir || (__dirname + '/../templates/');
    var contents = _.template(fs.readFileSync(path.resolve(dir + file), "utf8"))(allAnswers);
    fs.writeFileSync(process.cwd() + '/' + file, contents);
};
var initiate = function (allAnswers) {
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
        var dirname = slug(allAnswers.name);
        nextStepsMessage += stepNumber(step) + " " + chalk_1.default.cyan('cd') + " into the " + chalk_1.default.green(dirname) + " directory\n";
        shelljs_1.mkdir('-p', dirname);
        process.chdir(path.resolve(dirname));
    }
    else if (allAnswers.starter === 'basic chart') {
        files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenix.js'];
        var customChartTemplateDir_1 = path.join(__dirname, '/../templates/', 'basic chart/');
        dirs = __spreadArrays(new Array(files.length)).map(function (_) { return customChartTemplateDir_1; });
        var dirname = slug(allAnswers.name);
        nextStepsMessage += stepNumber(step) + " " + chalk_1.default.cyan('cd') + " into the " + chalk_1.default.green(dirname) + " directory\n";
        shelljs_1.mkdir('-p', dirname);
        process.chdir(path.resolve(dirname));
    }
    else if (allAnswers.starter === 'map chart') {
        files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js', 'domoPhoenixWithMaps.js'];
        var customChartTemplateDir_2 = path.join(__dirname, '/../templates/', 'map chart/');
        dirs = __spreadArrays(new Array(files.length)).map(function (_) { return customChartTemplateDir_2; });
        var dirname = slug(allAnswers.name);
        nextStepsMessage += stepNumber(step) + " " + chalk_1.default.cyan('cd') + " into the " + chalk_1.default.green(dirname) + " directory\n";
        shelljs_1.mkdir('-p', dirname);
        process.chdir(path.resolve(dirname));
    }
    // populate and write out the template files
    writeFilesIfNonexistent(files, dirs, allAnswers, function (err, res) {
        if (err) {
            log.fail('Cannot initialize new design. Doing so would overwrite existing files:' + err);
        }
        else {
            nextStepsMessage += stepNumber(step) + " Edit the files that were just generated. \n" + stepNumber(step) + " Run " + chalk_1.default.cyan('domo login') + " if you haven't already. \n" + stepNumber(step) + " Run " + chalk_1.default.cyan('domo publish') + " whenever you make changes. \n" + stepNumber(step) + " Add a Custom App card to any page in Domo. ";
            log.ok("New design initialized in the " + chalk_1.default.green(__dirname || 'current') + " directory", nextStepsMessage);
        }
        if (allAnswers.starter === 'hello world') {
            fs.remove('node_modules');
        }
        process.exit();
    });
};
/**
   * Add an incrementing step to the instructions message
   */
var stepNumber = function (step) {
    step++;
    return step + ".";
};
//# sourceMappingURL=init.js.map