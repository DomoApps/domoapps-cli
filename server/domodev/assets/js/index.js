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
  var whitelist = [
    'domo.com', 'github.com', 'salesforce.com', 'trello.com', 'jira.com', 'coupahost.com',
    'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'predictivetoolkit.net',
    'egnyte.com', 'crmondemand.com', 'google.com', 'adobe.com', 'domo.buzz', 'spotify.com', 'wired.com',
    'gizmodo.com', 'techcrunch.com', 'fastcodesign.com', 'arstechnica.com', 'fastcompany.com',
    'nytimes.com', 'thenextweb.com', 'medium.com', 'mashable.com', 'springboard.com', 'theverge.com',
    'sciencebulletin.org', 'buzzfeed.com', 'huffingtonpost.com', 'bloomberg.com'
  ];
  return _.includes(whitelist, name);
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
  document.querySelector('.app').style.padding = chk ? '0px 50px' : 0;
  document.querySelector('.app__wrapper').style.height = chk ? 'calc(100% - 60px)' : height;
  document.querySelector('.app__wrapper').style.width = chk ? '100%' : width;
  document.querySelector('iframe').style.width = chk ? '100%' : width;
  document.querySelector('iframe').style.height = chk ? 'calc(100% - 140px)' : height;
  document.querySelector('.size').innerHTML = chk ? 'FULL-WIDTH x FULL-HEIGHT' : width +' x '+ height;
}

function setDims(h, w) {
  height = h,
  width = w;
}
