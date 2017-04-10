// support link API
var height;
var width;

window.addEventListener('message', function(e) {
  var message = JSON.parse(e.data);
  if (message.event === 'navigate'){
    var host = getHost(message.url);

    if (host.isLocal){
      console.info('this relative link WILL work in Domo, just not in domo dev');
      return;
    }

    var isSafe = isHostSafe(host.name);
    if (!isSafe){
      console.warn('Custom App tried to navigate to a currently unsupported domain');
      return;
    }

    if (message.isNewWindow){
      window.open(message.url, '_blank');
    }
    else{
      window.location.href = message.url;
    }

  }
});


function isHostSafe(name){
  var whitelist = ['domo.com', 'github.com', 'salesforce.com', 'trello.com', 'jira.com', 'coupahost.com', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'predictivetoolkit.net', 'egnyte.com', 'crmondemand.com', 'google.com', 'adobe.com', 'domo.buzz', 'spotify.com'];
  return _.contains(whitelist, name);
}

function getHost(url){
  var tmp = document.createElement ('a');
  tmp.href = url;
  var segments = tmp.hostname.split('.');
  var name = segments[segments.length -2] + '.' + segments[segments.length -1];
  var isLocal = (segments[segments.length -1] === 'localhost');
  return {
    name: name,
    isLocal: isLocal
  }
}

function fullscreen(chk, h, w) {
  if(!height && !width) {
    setDims(h, w);
  }
  document.querySelectorAll('.app')[0].style.padding = chk ? '0px 50px' : 0;
  document.querySelectorAll('.app__wrapper')[0].style.height = chk ? 'calc(100% - 60px)' : height;
  document.querySelectorAll('.app__wrapper')[0].style.width = chk ? '100%' : width;
  document.querySelectorAll('iframe')[0].style.width = chk ? '100%' : width;
  document.querySelectorAll('iframe')[0].style.height = chk ? 'calc(100% - 140px)' : height;
  document.querySelectorAll('.size')[0].innerHTML = chk ? 'FULL-WIDTH x FULL-HEIGHT' : width +' x '+ height;
}

function setDims(h, w) {
  height = h,
  width = w;
}
