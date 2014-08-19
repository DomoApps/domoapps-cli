var path = require('path');
var request = require('superagent');
var fs = require('fs');
var glob = require('glob');
var chalk = require('chalk');
module.exports = domo;
var server = 'http://localhost:19800';
// var server = 'http://dev3.dev.domo.com:9800';
// var server = 'http://dev.local.domo.com';
// var server = 'http://dev3.maestro.domosoftware.net:9800';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

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
domo.publish = function(file){
  var manifest = require(path.resolve('manifest.json'));
  if (!manifest.id){
    createNewDesign(manifest, function(){
      upload(manifest, file);
    });
  }
  else{
    // TODO: only call this if the file is the manifest file or null
    if (!file || file === 'manifest.json'){
      updateDesign(manifest);
    }
    upload(manifest, file);
  }
}

/**
 * authenticate to a domo instance
 */
domo.login = function(instance, email, password, callback){
  request
    .post('https://' + instance + '.domo.com/api/domoweb/auth/login')
    .send({username: email, password: password})
    .end(function(res){
      if (res.status === 200 && res.redirects.length == 0){
        fs.writeFileSync(path.resolve('.login'), res.body.sid);
        console.log(chalk.green('\u2713'), 'Login successful. Welcome, ' + res.body.user.USER_FULLNAME + '.');
        callback();
      }
      else if (res.body.reason === 'invalidCredentials'){
        console.log(chalk.red('X'), 'Login unsuccessful: invalid credentials');
      }
      else{
        console.log(chalk.red('X'), 'Login unsuccessful');
      }
    });
}

/**
 * determine if one or all assets should be uploaded
 */
function upload(manifest, file){
  if (file){
    uploadAsset(manifest, file)
  }
  else {
    uploadAllAssets(manifest);
  }
}


/**
 * upload all assets to S3
 */
function uploadAllAssets(manifest){
  glob("**/*.*", {}, function (er, files) {
    files.forEach(function(file){
      uploadAsset(manifest, file);
    });
  });
}

/**
 * upload an asset to S3
 */
function uploadAsset(manifest, file){
  var url = server + '/domoapps/designs/' + manifest.id + '/versions/'+ manifest.version+'/assets?path=' + file;

  request
    .post(url)
    .set('X-Domo-Authentication', getLogin())
    .attach('file', path.resolve(file))
    .end(function(resp){
      console.log(chalk.green('\u2713'), file, 'uploaded');
      // console.log("uploadAsset response", resp.status, resp.body);
    });
}

/**
 * Create a new design
 * An id is returned and placed into the manifest file
 */
function createNewDesign(manifest, callback){
  var url = server + '/domoapps/designs?path=manifest.json';
  request
    .post(url)
    // .set('X-Domo-Authentication', process.env.TOKEN)
    .set('X-Domo-Authentication', getLogin())
    .send(manifest)
    .end(function(resp){
      console.log(chalk.green('\u2713'), 'new design created');
      // console.log("createNewDesign status", resp.status);
      if (resp.body.id){
        manifest.id = resp.body.id;
        fs.writeFileSync(path.resolve('manifest.json'), JSON.stringify(manifest, null, 2));
        callback(manifest);
      }
    });
}

/**
 * Publish a design
 * Uses the version in the manifest file
 */
function updateDesign(manifest){
  var url = server + '/domoapps/designs/' + manifest.id + '/versions?path=manifest.json';
  request
    .post(url)
    // .set('X-Domo-Authentication', process.env.TOKEN)
    .set('X-Domo-Authentication', getLogin())
    .send(manifest)
    .end(function(resp){
      console.log(chalk.green('\u2713'), 'design updated');
      // console.log("updateDesign response", resp.status);
    });
}

function getLogin(){
  return fs.readFileSync(path.resolve('.login')).toString();
}