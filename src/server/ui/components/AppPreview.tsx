import React, {useEffect, useRef} from 'react';

interface AppPreviewProps {
  url: string;
  width: string;
  height: string;
  isFullscreen: boolean;
  manifest: any;
  thumbnail: string | null;
  size: string;
}

// Domain whitelist for navigation (matches old implementation)
const ALLOWED_DOMAINS = [
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

function isHostSafe(hostname: string): boolean {
  const segments = hostname.split('.');
  const domain =
    segments.length > 1
      ? `${segments[segments.length - 2]}.${segments[segments.length - 1]}`
      : hostname;
  return ALLOWED_DOMAINS.includes(domain);
}

export function AppPreview({
  url,
  width,
  height,
  isFullscreen,
  manifest,
  thumbnail,
  size,
}: AppPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Handle Link API messages from the iframe
    function handleMessage(event: MessageEvent) {
      let message: any;
      try {
        message =
          typeof event.data === 'string' && event.data.startsWith('{')
            ? JSON.parse(event.data)
            : event.data;
      } catch (err) {
        console.warn('Invalid message data:', event.data);
        return;
      }

      if (message.event === 'navigate') {
        try {
          const parsedUrl = new URL(message.url, window.location.origin);

          // Check if it's a local URL
          if (parsedUrl.hostname === 'localhost') {
            console.info(
              'This relative link WILL work in Domo, just not in domo dev',
            );
            return;
          }

          // Check if domain is safe
          if (!isHostSafe(parsedUrl.hostname)) {
            console.warn(
              'Custom App tried to navigate to a currently unsupported domain:',
              parsedUrl.hostname,
            );
            return;
          }

          // Navigate
          if (message.isNewWindow) {
            window.open(message.url, '_blank');
          } else {
            window.location.href = message.url;
          }
        } catch (err) {
          console.error('Error processing navigation message:', err);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <section
      className="app-section"
      style={{padding: isFullscreen ? '0 50px' : 0}}
    >
      <div
        className="app-wrapper"
        style={{
          width: width,
          height: isFullscreen ? 'calc(100vh - 120px)' : height,
        }}
      >
        <div className="app-header">
          {thumbnail && (
            <img src={thumbnail} alt="App thumbnail" className="app-thumbnail" />
          )}
          <h2 className="app-title">{manifest.name}</h2>
        </div>

        <iframe
          ref={iframeRef}
          src={url}
          className="app-iframe"
          style={{
            width: width,
            height: isFullscreen ? 'calc(100% - 140px)' : height,
          }}
          title="App Preview"
        />

        <div className="app-size">{size}</div>
      </div>
    </section>
  );
}
