// support link API
let height;
let width;

window.addEventListener('message', function (e) {
  let message;
  try {
    message = e.data;
    if (typeof e.data === 'string' && e.data.startsWith('{'))
      message = JSON.parse(e.data);
  } catch (err) {
    console.warn('Invalid message data:', e.data);
    return;
  }

  if (message.event === 'navigate') {
    const host = getHost(message.url);

    if (host.isLocal)
      return console.info(
        'This relative link WILL work in Domo, just not in domo dev',
      );

    if (!isHostSafe(host.name))
      return console.warn(
        'Custom App tried to navigate to a currently unsupported domain',
      );

    if (message.isNewWindow)
      window.open(message.url, '_blank');
    else
      window.location.href = message.url;
  }
});

/**
 * Checks if the host is in the whitelist.
 * @param {string} name
 * @returns {boolean}
 */
function isHostSafe(name) {
  const whitelist = [
    'domo.com',
    'github.com',
    'salesforce.com',
    'trello.com',
    'jira.com',
    'coupahost.com',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'youtube.com',
    'linkedin.com',
    'predictivetoolkit.net',
    'egnyte.com',
    'crmondemand.com',
    'google.com',
    'adobe.com',
    'domo.buzz',
    'spotify.com',
    'wired.com',
    'gizmodo.com',
    'techcrunch.com',
    'fastcodesign.com',
    'arstechnica.com',
    'fastcompany.com',
    'nytimes.com',
    'thenextweb.com',
    'medium.com',
    'mashable.com',
    'springboard.com',
    'theverge.com',
    'sciencebulletin.org',
    'buzzfeed.com',
    'huffingtonpost.com',
    'bloomberg.com',
  ];
  return whitelist.includes(name);
}

/**
 * Extracts the host and checks if it's local.
 * 
 * @param {string} url
 * @returns {{name: string, isLocal: boolean}}
 */
function getHost(url) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const segments = parsedUrl.hostname.split('.');
    const name =
      segments.length > 1
        ? `${segments[segments.length - 2]}.${segments[segments.length - 1]}`
        : parsedUrl.hostname;
    const isLocal = parsedUrl.hostname === 'localhost';
    return {name, isLocal};
  } catch (err) {
    return {name: '', isLocal: false};
  }
}

/**
 * Toggles fullscreen mode and updates dimensions.
 * 
 * @param {boolean} chk
 * @param {string} h
 * @param {string} w
 */
function fullscreen(chk, h, w) {
  if (!height && !width) {
    setDims(h, w);
  }
  const app = document.querySelector('.app');
  const wrapper = document.querySelector('.app__wrapper');
  const iframe = document.querySelector('iframe');
  const size = document.querySelector('.size');

  if (!app || !wrapper || !iframe || !size) return;

  app.style.padding = chk ? '0px 50px' : '0';
  wrapper.style.height = chk ? 'calc(100% - 60px)' : height;
  wrapper.style.width = chk ? '100%' : width;
  iframe.style.width = chk ? '100%' : width;
  iframe.style.height = chk ? 'calc(100% - 140px)' : height;
  size.innerHTML = chk ? 'FULL-WIDTH x FULL-HEIGHT' : `${width} x ${height}`;
}

/**
 * Sets the initial dimensions.
 * 
 * @param {string} h
 * @param {string} w
 */
function setDims(h, w) {
  height = h;
  width = w;
}
