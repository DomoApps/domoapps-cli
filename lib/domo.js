var path = require('path');
var request = require('superagent');
var fs = require('fs-extra');
var glob = require('glob');
var chalk = require('chalk');
var home = path.resolve(getUserHome() + '/.domo');

var logo =
"┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃██████████      ██████████  ███            ██   ██████████  ┃\n"+
"┃████████████  ███████████████████        ███████████████████┃\n"+
"┃███      ████████        ██████████    ██████████        ███┃\n"+
"┃███       ██████          ██████████████████████          ██┃\n"+
"┃███      ███████          ██████ ███████  ██████          ██┃\n"+
"┃███     █████████       ████████   ███    ███████       ████┃\n"+
"┃████████████  ██████████████████          ██████████████████┃\n"+
"┃██████████      ██████████  ████          ███   ██████████  ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┃                                                            ┃\n"+
"┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n";

module.exports = domo;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var server = '';

/**
 * TODO: 
 * Make sure publishing of assets works the first time when a new design is published.
 * Developer authentication.
 */

function domo(){}

/**
 * Publish a domoapp
 * If domoapp is new, call the create service
 * otherwise just publish the files (concurrently) to s3
 */
domo.publish = function(customer, token, file){
  server = 'https://' + customer + '.domo.com';
  var manifest = require(path.resolve('manifest.json'));
  if (!manifest.id){
    createNewDesign(manifest, customer, token, function(){
      upload(manifest, token, file);
    });
  }
  else{
    if (!file || file === 'manifest.json'){
      updateDesign(manifest, token);
    }
    upload(manifest, token, file);
  }
}

/**
 * authenticate to a domo instance
 */
domo.login = function(customer, email, password){
  request
    .post('https://' + customer + '.domo.com/api/domoweb/auth/login')
    .send({username: email, password: password})
    .end(function(res){
      if (res.status === 200 && res.redirects.length == 0){
        console.log(chalk.green('\u2713'), 'Login successful. Welcome, ' + res.body.user.USER_FULLNAME + '.');
        var loginFile = path.resolve(home + '/login/' + customer + '.json');
        fs.ensureFileSync(loginFile);
        console.log("loginFile", loginFile);
        fs.writeJsonSync(loginFile, { sid: res.body.sid, user: email, customer: customer });
        console.log(chalk.cyan(logo));
      }
      else if (res.body.reason === 'invalidCredentials'){
        console.log(chalk.red('X'), 'Login unsuccessful: invalid credentials');
      }
      else{
        console.log(chalk.red('X'), 'Login unsuccessful', res);
      }
    });
}


/**
 * migrate a domoapp
 * 1. get the kpi info
 * 2. create a new domoapp design
 * 3. publish design assets
 * 4. create a new domoapp
 * 5. update the kpi
 */
domo.migrateApp = function(customer, token, manifest, id){
  server = 'https://' + customer + '.domo.com';
  var kpiUrl = 'http://apiContent.' + customer + '.domo.com:9400/api/content/v1/cards';

  request
    .get(kpiUrl + '?urns=' + id + '&parts=domoapp,metadata')
    .set('X-Domo-Authentication', token)
    .end(function(resp){
      createNewDesign(manifest, customer, token, function(design){
        createNewDomoapp(token, design.id, function(domoapp){
          var card = resp.body[0];
          card.type = card.metadata.chartType = card.metadata.kpiType = 'domoapp';
          card.domoapp.id = domoapp.id;
          // update kpi
          request
            .post(kpiUrl + '/' + card.id)
            .set('X-Domo-Authentication', token)
            .send(card)
            .end(function(cardResp){
              if (cardResp.status === 200){
                console.log(chalk.green('\u2713'), 'card migrated');
                uploadAllAssets(manifest, token);
              }
              else {
                console.log(chalk.red('X'), 'error migrating card');
              }
            })
        });
      });
    });
};

domo.getUserHome = getUserHome;
function getUserHome(){
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/**
 * determine if one or all assets should be uploaded
 */
function upload(manifest, token, file){
  if (file){
    uploadAsset(manifest, token, file)
  }
  else {
    uploadAllAssets(manifest, token);
  }
}


/**
 * upload all assets to S3
 */
function uploadAllAssets(manifest, token){
  glob("**/*.*", {}, function (er, files) {
    files.forEach(function(file){
      uploadAsset(manifest, token, file);
    });
  });
}

/**
 * upload an asset to S3
 */
function uploadAsset(manifest, token, file){
  var url = server + '/domoapps/designs/' + manifest.id + '/versions/'+ manifest.version+'/assets?path=' + file;

  request
    .post(url)
    .set('X-Domo-Authentication', token)
    .attach('file', path.resolve(file))
    .end(function(resp){
      if (resp.status === 200){
        console.log(chalk.green('\u2713'), file, 'uploaded');
      }
      else if (resp.status === 401){
        console.log(chalk.red('X'), 'You must be logged in, use "domo login"');
      }
      else {
        console.log(chalk.red('X'), 'Error uploading', file);
      }
    });
}

/**
 * Create a new design
 * An id is returned and placed into the manifest file
 */
function createNewDesign(manifest, customer, token, callback){
  var url = server + '/domoapps/designs?path=manifest.json';
  delete manifest.customer;

  request
    .post(url)
    .set('X-Domo-Authentication', token)
    .send(manifest)
    .end(function(resp){
      console.log(chalk.green('\u2713'), 'new design created');
      if (resp.body.id){
        // add the design id and customer to the manifest
        // later we can support publishing to multiple customers at a time
        manifest.id = resp.body.id;
        manifest.customer = customer;
        fs.writeFileSync(path.resolve('manifest.json'), JSON.stringify(manifest, null, 2));
        callback(manifest);
      }
    });
}

function createNewDomoapp(token, designId, callback){
  var url = server + '/domoapps/apps'
  // http://dev.local.domo.com:9800/domoapps/apps
  request
    .post(url)
    .set('X-Domo-Authentication', token)
    .send({
      designId: designId,
      mapping: []
    })
    .end(function(resp){
      callback(resp.body);
    });
}

/**
 * Publish a design
 * Uses the version in the manifest file
 */
function updateDesign(manifest, token){
  var url = server + '/domoapps/designs/' + manifest.id + '/versions?path=manifest.json';
  // server doesn't use the customer field
  var customer = manifest.customer;
  delete manifest.customer;

  request
    .post(url)
    .set('X-Domo-Authentication', token)
    .send(manifest)
    .end(function(resp){
      // restore removed field
      // TODO: make server accept the customer property
      manifest.customer = customer;
      if (resp.status === 200){
        console.log(chalk.green('\u2713'), 'design updated');
      }
      else if (resp.status === 401){
        console.log(chalk.red('X'), 'You must be logged in, use "domo login"');
      }
      else {
        console.log(chalk.red('X'), 'Error updating design');
        console.log(resp);
      }
    });
}