// support link API
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
  var whitelist = ['domo.com', 'github.com', 'salesforce.com', 'trello.com', 'jira.com', 'coupahost.com'];
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
