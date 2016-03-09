#!/usr/bin/env node --harmony
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

var semver = require('semver');
var chalk = require('chalk');
var program = require('commander');
verifyNodeVersion();

var path = require('path');
var _ = require('lodash');
var glob = require("glob");
var fs = require('fs-extra');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
// can remove these in a few releases after deprecating older versions
cleanupLogins();
cleanupMappings();
var previousLogins = getPreviousLogins();

var inquirer = require("inquirer");
var Promise = require('bluebird');
var validator = require('validator');
var chokidar = require('chokidar');
var server = require('../server/server');
var async = require('async');
var shell = require('shelljs');
var request = Promise.promisify(require('request'));
var extract = require('extract-zip');
require('../polyfills/endswith');
var session = require('../util/session');
var slug = require('slug');

var logo = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃██████████      ██████████  ███            ██   ██████████  ┃
┃████████████  ███████████████████        ███████████████████┃
┃███      ████████        ██████████    ██████████        ███┃
┃███       ██████          ██████████████████████          ██┃
┃███      ███████          ██████ ███████  ██████          ██┃
┃███     █████████       ████████   ███    ███████       ████┃
┃████████████  ██████████████████          ██████████████████┃
┃██████████      ██████████  ████          ███   ██████████  ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;


var mostRecent = getMostRecentLogin();

program
  .version(cliVersion, '-v, --version')
  .option('-w, --watch', 'publish Custom App design every time a file changes')
  .option('-vb, --verbose', 'log more details including XHR responses, useful for troubleshooting');

program
  .command('ls')
  .description('get a list of all your Custom App designs')
  .action(function(){
    var login = getMostRecentLogin();
    verifyLogin(login);
    var domo = new Domo(login.instance, login.sid);

    session.check(domo)
      .then(function(){

        domo.getDesigns().then(function(designs){
          var Table = require('cli-table');

          // instantiate
          var table = new Table({
            head: [chalk.cyan('Design Name'), chalk.cyan('Design Id'), chalk.cyan('Date Created'), chalk.cyan('Last Updated')]
          });

          designs.forEach(function(design){
            table.push([design.design.name, design.design.id, new Date(design.design.createdDate).toUTCString(), new Date(design.design.lastModifiedDate).toUTCString()]);
          });

          if (designs.length === 0){
            fail('No Designs Published', "`domo ls` will list designs once they're published to Domo");
          }

          console.log(table.toString());
        })
        .catch(function(e){
          fail('Unable to fetch designs', 'You may not have any designs published yet.');
        })

      })
      .catch(function(){
        fail('Not authenticated', 'Please login using "domo login"');
      })
  });

program
  .command('download')
  .description('dowmload a Custom App design')
  .action(function(){
    var login = getMostRecentLogin();
    verifyLogin(login);

    var domo = new Domo(login.instance, login.sid);

    inquirer.prompt([{
        type: 'input',
        message: 'design id',
        name: 'designId'
      },
      {
        type: 'input',
        message: 'version',
        name: 'version',
        default: 'latest'
      }], function(answers){
        var req = domo.download(answers.designId, answers.version);

        req.on('response', function(response){
          var regexp = /filename="(.*)"/;
          var name = response.headers['content-disposition'].match(regexp)[1] || 'domoapp';

          var writeStream = fs.createWriteStream('./'+name+'.zip', {flags: 'w+', mode: 0o666});
          req.pipe(writeStream);

          writeStream.on('finish', function(){
            var source = path.resolve('./'+name+'.zip');
            var target = path.resolve('./'+name);

            extract(source, {dir: target}, function(err, results) {
              if (!err){
                shell.chmod('-R', 'u+w', target);
                fs.remove(source);
              }
            });
          });
        });
      });

  });

program
  .command('publish')
  .description('publish a new or existing Custom App design')
  .action(function(){
    var manifest = getManifest();
    if (!manifest) return;

    var login = getMostRecentLogin();
    verifyLogin(login);

    var domo = new Domo(login.instance, login.sid);

    if (!manifest.id){
      createDesign(domo, manifest, login);
    }
    else{
      domo.uploadAllAssets(manifest)
        .tap(evoke(ok, 'Publishing ' + manifest.name + ' to ' + login.instance + ' on ' + new Date()))
        .then(logUploadSuccess)
        .catch(function(e){
          if(e.statusCode === 401) {
            fail('You are not logged in. Please login with \'domo login\' and then try logging in again.');
          }
          else if(e.statusCode === 403) {
            fail('You do not have access to the design with id ' + manifest.id + ' on ' + login.instance
              + '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.'
              + '\nAlternatively, you may have inadvertently changed the design id.');
          }
          else if(e.message && e.message.startsWith('DA')) {
            switch (e.message.substr(0, 6)) {
              case 'DA0086':
                warn(e.message);
                inquirer.prompt([
                  {
                    type: 'confirm',
                    message: 'This design has been deleted. Would you like to publish a new design with these assets?',
                    name: 'askRecreate'
                  }
                ], function (answers) {
                  if (answers.askRecreate){
                    manifest.id = null;
                    createDesign(domo, manifest, login);
                  }
                });

                break;

              default:
                // Pass on error messages that are in the set of documented errors.
                fail(e.message);
                break;
            }
          }
          else {
            fail(e || 'Error uploading assets');
          }
        });
    }

    if (program.watch){ watch(domo, login, manifest); }
  });

/**
 * @param {Object} domo
 * @param {Object} manifest
 * @param {Object} login
 * @return {Promise}
 */
function createDesign(domo, manifest, login) {
  return domo.createDesign(manifest)
    .then(function(designResult){
      var design = designResult[0];
      // add the version returned when design published
      design.version = designResult[1].version;
      return persistDesignId(design, manifest);
    })
    .tap(evoke(ok, 'New design created on ' + login.instance))
    .catch(evoke(fail, 'Error creating new design'))
    .then(domo.uploadAllAssets.bind(domo))
    .then(logUploadSuccess)
    .catch(function(e){
      fail(e || 'Error uploading assets');
    });
}

program
  .command('init')
  .description('initialize a new Custom App design')
  .action(function(){
    inquirer.prompt([
      {
        type: 'input',
        message: 'design name',
        name: 'name'
      },
      {
        type: 'list',
        message: 'select a starter',
        name: 'starter',
        choices: ['hello world', 'manifest only']
      }

      ], function(answers){
        answers.datasources = [];
        askDatasource(answers, function(allAnswers){
          var files;
          var dirs;
          var step = 0;
          var nextStepsMessage = 'Next steps: \n';

          if(allAnswers.starter === 'manifest only'){
            files = ['manifest.json'];
            dirs = [null];
          }
          else if (allAnswers.starter === 'hello world'){
            files = ['manifest.json', 'index.html', 'app.js', 'app.css', 'domo.js'];
            dirs = [null, null, null, null, null];

            var dirname = slug(answers.name);
            nextStepsMessage += `${stepNumber()} ${chalk.cyan('cd')} into the ${chalk.green(dirname)} directory\n`;

            shell.mkdir('-p', dirname);
            process.chdir(path.resolve(dirname));
          }

          // populate and write out the template files
          writeFilesIfNonexistent(files, dirs, allAnswers, function(err, res) {
            if(err) {
              fail('Cannot initialize new design. Doing so would overwrite existing files:' + err);
            }
            else {
              nextStepsMessage += `${stepNumber()} Edit the files that were just generated. \n${stepNumber()} Run ${chalk.cyan('domo publish')} whenever you make changes. \n${stepNumber()} Add a Custom App card to any page in Domo. `;
              ok(`New design initialized in the ${chalk.green(dirname || 'current')} directory`, nextStepsMessage);
            }

            if (allAnswers.starter === 'hello world'){
              fs.remove('node_modules');
            }

          });

          /**
           * Add an incrementing step to the instructions message
           */
          function stepNumber(){
            step++;
            return `${step}.`;
          }


        });
      });
  });

function writeFilesIfNonexistent(files, dirs, allAnswers, callback) {
  async.reduce(files, [], function(filesThatExist, file, reduceCallback) {
    fs.open(file,'r',function(err, fd) {
      var fileExists = !err;
      if(fileExists) {
        fs.closeSync(fd);
        filesThatExist.push(file);
      }
      reduceCallback(null, filesThatExist);
    });
  }, function(err, filesThatExist) {
    if(filesThatExist.length > 0) {
      callback(filesThatExist, null);
    }
    else {
      _.zip(files,dirs).forEach(writeTemplateFile);
      callback(null, files);
    }
  });

  function writeTemplateFile(filedir){
    var file = filedir[0];
    var dir = filedir[1];
    dir = dir || (__dirname + '/../templates/');
    var contents = _.template(fs.readFileSync(path.resolve(dir + file )))(allAnswers);

    fs.writeFileSync(process.cwd() + '/' + file, contents);
  }
}

function addDatasource(currentAnswers, callback){
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
        validate: function(name){
          if (!isValidJSName(name)) return 'Alias must be a valid JavaScript property';
          return true;
        }
      }
    ], function(datasource){
        currentAnswers.datasources.push(datasource);
        callback(currentAnswers);
    });
}

// recursively ask user to enter all their datasources
function askDatasource(currentAnswers, callback){
  inquirer.prompt([
    {
      type: 'confirm',
      message: currentAnswers.datasources.length > 0 ? 'add another dataset?' : 'would you like to connect to any datasets?',
      name: 'askDatasource'
    }
  ], function(answers){
    if (answers.askDatasource){
      addDatasource(_.merge(currentAnswers, answers), function(combinedAnswers){
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

program
  .command('owner <add|rm|ls> [user-emails...]')
  .description('Manage design owners')
  .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
  .action(function(action, users, options) {

    var designId;
    if (options.design_id) {
      designId = options.design_id;
      if (!designId || !validator.isUUID(designId)) return fail('The value specified for option -i is not a valid design ID', designId);
    } else {
      var manifest = getManifest();
      if (!manifest) return fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
      if (!manifest.id) return fail('No manifest id. Please publish your design before attempting to add owners to it.');
      designId = manifest.id;
    }

    var login = getMostRecentLogin();
    verifyLogin(login);

    var domo = new Domo(login.instance, login.sid);

    switch(action) {
      case 'add':
        if (users) {
          domo.addOwners(designId, users)
            .tap(evoke(ok, 'Owners added ' + users))
            .catch(evoke(fail, 'Error adding owners'));
        }
        break;
      case 'rm':
        if (users) {
          domo.removeOwners(designId, users)
            .tap(evoke(ok, 'Owners removed ' + users))
            .catch(evoke(fail, 'Error removing owners'));
        }
        break;
      case 'ls':
        domo.getOwners(designId)
          .tap(function listUsers(res) {
            res.sort();
            ok("Owners for design " + designId);
            res.forEach(function(element, index, array) {
              console.log("\t" + element);
            });
          })
          .catch(evoke(fail, 'Error retrieving owners'));
        break;
    }
  });

program
  .command('delete')
  .description('Deletes a published design')
  .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
  .option('-f, --force', 'Delete the design even if it is referenced by Custom Apps')
  .action(function(options) {

    var designId;
    if (options.design_id) {
      designId = options.design_id;
      if (!designId || !validator.isUUID(designId)) return fail('The value specified for option -i is not a valid design ID', designId);
    } else {
      var manifest = getManifest();
      if (!manifest || !manifest.id) return fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
      designId = manifest.id;
    }

    var force = false;
    if (options.force) force = true;

    var login = getMostRecentLogin();
    verifyLogin(login);

    var domo = new Domo(login.instance, login.sid);

    domo.deleteDesign(designId, force)
      .tap(evoke(ok, 'Deleted design ' + designId))
      .catch(evoke(fail, 'Unable to delete design ' + designId));
  });

program
  .command('login')
  .description('login to Domo')
  .action(function(){
    // prompt user
    inquirer.prompt([
      {
        type: "list",
        choices: function(){
          var options = _.pluck(previousLogins, 'instance');
          options.push('new instance');
          return options;
        },
        message: "Domo instance " + chalk.grey("e.g. ebay.domo.com "),
        name: 'instance',
        default: mostRecent.instance,
        // only show up if they have previous logins
        when: function(answers){
          return previousLogins.length > 0;
        }
      },
      {
        type: "input",
        message: "Domo instance " + chalk.grey("e.g. ebay.domo.com "),
        name: "instance",
        when: function(answers){
          // only ask if the instance selector wasn't used or new one was selected
          return !answers.instance || answers.instance === 'new instance';
        }
      },
      {
        type: "input",
        message: "user email",
        name: "email",
        default: function(answers){
          // populate with previous email used with this instance
          var previous = _.find(previousLogins, {instance: answers.instance});
          if (previous) return previous.user;
        }
      },
      {
        type: "password",
        message: "Domo password",
        name: "password"
      }
    ], function(answers) {
      if (!answers.instance.endsWith('domo.com') && !answers.instance.endsWith('domotech.io')){
        fail('Please login using the full Domo instance.', 'Example: "ebay.domo.com"');
      }

      var login;

      var domo = new Domo(answers.instance, null);
      domo
        .login(answers.email, answers.password)
        .then(function(l){
          return login = l;
        })
        .then(checkVersion.bind(null, answers.instance))
        .then(verifyVersion)
        .then(function(){
            ok('Login to ' + answers.instance + ' successful.', 'Welcome, ' + login.user.USER_FULLNAME + '.');
            console.log(chalk.cyan(logo));
            return login;
        })
        .then(persistLogin(answers.instance, answers.email))
        .catch(evoke(fail, 'Login unsuccessful'));
    });
  });

program
  .command('migrate')
  .description('migrate a mason app to a Custom App')
  .action(function(){
    var manifest = getManifest();
    if (!manifest) return;


    inquirer.prompt([
      {
        type: "input",
        message: "Domo instance",
        name: "instance",
        default: mostRecent.instance
      },
      {
        type: "input",
        message: "app id",
        name: "id"
      }
    ], function(answers) {
      var login = getLogin(answers.instance);
      verifyLogin(login);

      var domo = new Domo(answers.instance, login.sid);

      migrateApp(domo, answers.id, manifest)
        .tap(evoke(ok, 'Migration successful'))
        .catch(evoke(fail, 'Migration unsuccessful'));
    });
  });

program
  .command('revert')
  .description('revert a migration, turning a Custom App back into a mason app')
  .action(function(){

    inquirer.prompt([
      {
        type: "input",
        message: "Domo instance",
        name: "instance",
        default: mostRecent.instance
      },
      {
        type: "input",
        message: "app id",
        name: "id"
      }
    ], function(answers) {
      var login = getLogin(answers.instance);
      verifyLogin(login);

      var domo = new Domo(answers.instance, login.sid);
      domo.getKpi(answers.id)
          .then(function(kpi){
            kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'mason';
            return kpi;
          })
          .then(function(kpi){
            return domo.updateKpi(kpi);
          })
          .tap(evoke(ok, 'Card reverted back to a mason app'))
          .catch(evoke(fail, 'Error attempting to revert card'));
    });

  });

program
  .option('--userId [value]', 'Use a specific userId')
  .command('dev')
  .description('work locally on a Custom App')
  .action(function(){
    var options = {
      userId: program.userId
    };

    var login = getMostRecentLogin();
    verifyLogin(login);
    var domo = new Domo(login.instance, login.sid);
    server.start(domo, options).catch(fail);
  });

program
  .command('release')
  .description('prepare a design for app store release')
  .action(function(){
    var login = getMostRecentLogin();
    verifyLogin(login);
    var domo = new Domo(login.instance, login.sid);
    var manifest = getManifest();

    // make sure app has been published first
    if (!manifest.id){
      fail('Can\'t release until design is published.', 'Please publish your Custom App design (with the `domo publish` command) first');
    }

    // make sure there is a thumbnail.png when releasing
    ensureThumbnail();

    // prompt the user for which design version they want to release, defaulting to latest
    domo.getVersions(manifest.id)
      .then(function(versions){
        versions.reverse();
        versions.unshift('latest');

        inquirer.prompt([
          {
            type: 'list',
            message: 'select a version to release',
            name: 'version',
            choices: versions
          }], function(answers){
            // release the kraken
            domo.release(manifest.id, answers.version)
              .tap(evoke(ok, 'Design version ('+answers.version+') released'))
              .catch(fail)
          })
      })
  })

program.parse(process.argv);


/**
 * E.T. phone home
 */
function checkVersion(instance){
  var options = {
    url: 'https://' + instance + '/domoapps/admin/checkversion?version=' + cliVersion,
    method: 'GET',
    json: true
  };

  return request(options);
}

/**
 * log message based on the action
 * if action is 'block' then 'fail' will get called and end the process early
 */
function verifyVersion(res){

  var body = res[0].body;
  if (body.action === 'block'){
    fail(body.message);
  }

  if (body.action === 'warn'){
    warn(body.message);
    return promptUpgrade(body.latest);
  }

  if (body.action === 'info'){
    info(body.message);
    return promptUpgrade(body.latest);
  }
}

function promptUpgrade(latest){
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      {
        type: "confirm",
        message: "Would you like to upgrade now?",
        name: "upgrade",
        default: true
      }

    ], function(answers) {
      if(answers.upgrade){
        info('Upgrading to latest version', 'Hang tight, this may take a moment...');
        var output = shell.exec('npm install ryuu -g', {async: false, silent: true});
        if (output.code === 0){
          ok('Upgrade to version '+latest+' successful');
          resolve();
        }
        else {
          warn('Upgrade unsuccessful', 'Please try upgrading manually with npm install -g ryuu');
        }
      }
      else{
        resolve();
      }
    });
  });
}

/**
 * migrate a mason app to a Custom App
 * 1. get the kpi info
 * 2. create a new Custom App design
 * 3. publish design assets
 * 4. create a new Custom App
 * 5. update the kpi
 */
function migrateApp(domo, appId, manifest){
  return Promise.all([
    domo.getKpi(appId),

        // .catch(evoke(fail, 'No app found with id ' + appId)),
    // publish new design (and persist id) if not already published
    domo.createDesign(manifest)
      .tap(evoke(ok, 'Design published'))
      .then(function(designResult){
        var design = designResult[0];
        return persistDesignId(design, manifest);
      })
      .catch(function(){
        return manifest;
      })
  ])
  .spread(function(kpi, design){
    return domo
        .createApp(design.id)
        .tap(evoke(ok, 'New Custom App created'))
        .catch(evoke(fail, 'Error creating new Custom App'))
        .then(function(domoapp){
          kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'domoapp';
          kpi.domoapp.id = domoapp.id;

          return domo.updateKpi(kpi)
              .tap(evoke(ok, 'Card type updated and linked'))
              .catch(evoke(fail, 'Error updating card'))
              .then(function(){
                return domo.uploadAllAssets(manifest);
              })
              .tap(evoke(ok, 'Assets uploaded'))
              .catch(evoke(fail, 'Error uploading assets'));
        });
  });

}

function cleanupLogins(){
  var prev = getPreviousLogins();
  var badLogins = _.filter(prev, function(login){
    return login.customer;
  });
  badLogins.forEach(function(login){
    var p = path.resolve(Domo.getHomeDir() + '/login/' + login.customer + '.json');
    fs.deleteSync(p);
  });
}

function cleanupMappings(){
  var manifest = getManifest(false);

  if (!manifest) { return; }

  var changed = false;

  if (!manifest.mapping || (manifest.mapping.length == 0)){ return; }

  manifest.mapping.forEach(function(dataPoint){
    if (dataPoint.dataSourceId && !dataPoint.dataSetId){
      dataPoint.dataSetId = dataPoint.dataSourceId;
      delete dataPoint.dataSourceId;
      changed = true;
    }
  });

  if (changed){
    updateManifest(manifest);
  }
}

function verifyLogin(login){
  if (!login.sid){
    fail('Not authenticated', 'Please login using "domo login"');
    return;
  }
}

function verifyNodeVersion(){
  var version = semver(process.version);
  var compatible = semver.gte(version, '0.12.0');
  if(!compatible){
    fail('Unsupported Node version', 'Please upgrade to Node v0.12.0 or higher. https://nodejs.org/');
  }
}

function watch(domo, login, manifest){
  var currentVersion = manifest.version;
  var currentDesignId = manifest.id;

  chokidar.watch('.', {ignored: /[\/\\]\./, ignoreInitial: true}).on('all', function(event, filepath) {

    // don't do anything for deleted files/folders
    if (event == 'unlink' || event == 'unlinkDir') return;

    // if manifest version or id changed, upload all assets
    if (filepath.indexOf('manifest.json') !== -1){
      var newManifest = getManifest();
      if (!newManifest) return;

      if (newManifest.version !== currentVersion || newManifest.id !== currentDesignId){
        domo.uploadAllAssets(manifest)
            .then(logUploadSuccess)
            .then(function(a){
              currentVersion = newManifest.version;
              currentDesignId = newManifest.id;
            })
            .tap(evoke(ok, 'Published new version ' + newManifest.version))
            .catch(evoke(fail, 'Error uploading assets'));
        return;
      }
    }

    // upload just the individual asset
    var relFilePath = path.relative(process.cwd(), filepath);
    domo.uploadAsset(manifest.id, manifest.version, relFilePath)
        .tap(evoke(ok, 'Uploaded: ' + relFilePath + ' ' + new Date().timeNow()))
        .catch(evoke(fail, 'Error uploading: ' + relFilePath));
  });
}

function logUploadSuccess(files){
  files.forEach(function(file){
    ok('Uploaded: ' + file.path);
  });
}

/**
 * curry a function
 */
function evoke(fn, message, submessage){
  return function(result){
    fn(message, submessage, result);
  };
}

/**
 * log a success
 */
function ok(msg, submessage){
  console.log(chalk.green('\u2713'), msg);
  if(submessage){
    console.log(chalk.gray(submessage));
  }
}

/**
 * log info
 */
function info(msg, submessage){
  console.log(chalk.cyan(msg));
  if(submessage){
    console.log(chalk.gray(submessage));
  }
}

/**
 * log warning
 */
 function warn(msg, submessage){
   console.log(chalk.yellow(msg));
   if(submessage){
     console.log(chalk.gray(submessage));
   }
 }


/**
 * log an error
 */
function fail(msg, submessage, result){
  console.log(chalk.red('X'), msg);

  if(submessage){
    console.log(chalk.gray(submessage));
  }

  if(result && result.message){
    console.log(chalk.gray(result.message));
  }

  if (program.verbose){
    console.log(chalk.red("statusCode:"), result.statusCode);
    if(result.details){
      console.log(chalk.red("details:"), result.details);
    }
    console.log(chalk.red("method:"), result.method);
    console.log(chalk.red("path:"), result.path);
    console.log(chalk.red("response:"), result.res);
  }

  process.exit();
}

function getMostRecentLogin(){
  var logins = glob.sync(home + "/login/*.json");
  if (logins.length === 0) return {};

  var recent = logins.reduce(function(prev, next){
    return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
  });
  return fs.readJsonSync(recent);
}

function getPreviousLogins(){
  var logins = (glob.sync(home + "/login/*.json") || [])
    .map(function(file){
      return fs.readJsonSync(file);
    });
  return logins;
}

/**
 * persist login to user's domo home
 */
function persistLogin(instance, email){
  return function(login){
    var loginFile = path.resolve(home + '/login/' + instance + '.json');
    fs.ensureFileSync(loginFile);
    fs.writeJsonSync(loginFile, { sid: login.sid, user: email, instance: instance });
    return login;
  };
}

/**
 * update the manifest (in memory and on disk)
 */
function persistDesignId(design, manifest){
  manifest.id = design.id;
  updateManifest(manifest);
  return design;
}

function getLogin(instance){
  return fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
}

/**
* Get the local manifest.json file, ensuring it's valid.
*/
function getManifest(verify = true){
  var manifest;
  try {
    manifest = fs.readFileSync(path.resolve('manifest.json'));
  }
  catch (e){
    if (verify){
      return fail('No manifest.json file in this directory', 'Please publish from a directory containing a Custom App design manifest.json file');
    }
    else{
      return;
    }
  }

  try {
    manifest = JSON.parse(manifest);
  }
  catch (e){
    return fail('Your manifest.json file is not valid JSON', e.message);
  }
  if (verify){
    validateManifest(manifest);
  }
  return manifest;
}

function updateManifest(manifest){
  fs.writeJsonSync('manifest.json', manifest, {spaces: 2});
}

/**
* Validate the manifest file.
*/
function validateManifest(manifest){

  // validate manifest file for required fields
  requireProperty(manifest, 'name');
  requireProperty(manifest, 'version');

  // validate required mapping fields
  manifest.mapping.forEach(function(dataPoint){
    requireProperty(dataPoint, 'dataSetId');
    requireProperty(dataPoint, 'alias');
    requireProperty(dataPoint, 'fields');
    ensureValidAlias(dataPoint.alias);

    // validate dataPoint mapping fields
    dataPoint.fields.forEach(function(field){
      requireProperty(field, 'alias');
      requireProperty(field, 'columnName');
      ensureValidAlias(field.alias);
    });
  });

  // validate semver
  if (!semver.valid(manifest.version)){
    fail('Invalid version', 'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/');
  }

  function requireProperty(obj, prop){
    if (!obj[prop]){
      fail('Missing required property: ' + prop, 'Please add the missing `'+ prop +'` property to your manifest.json file.');
    }
  }

  return manifest;
}

/**
 * Ensure that there is a thumbnail.png file
 * Used on domo release
 */
function ensureThumbnail(){
  try {
    var thumbnail = fs.readFileSync(path.resolve('thumbnail.png'));
  }
  catch (ex){
    fail('Design thumbnail.png required.', 'Please add a 300x300 image named thumbnail.png to the root of your project to represent your design.');
  }
}

/**
 * Alias must be a valid JS property
 */
function ensureValidAlias(name){
  if (!isValidJSName(name)){
    fail('Alias names must be valid JavaScript properties', 'Please rename the `' + name + '` alias and update any /data/v1/<alias> calls with the new alias name');
  }
}

function isValidJSName(name){
  return !name.match(/[^a-zA-Z\$\_\d]+/);
}

Date.prototype.timeNow = function () {
     return "(" + ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ")";
}
