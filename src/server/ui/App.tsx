import React, {useState, useEffect} from 'react';
import {AppPreview} from './components/AppPreview';
import {Controls} from './components/Controls';
import {Warning} from './components/Warning';

interface DomoDevData {
  manifest: any;
  width: number;
  height: number;
  userId: string;
  customerId: number;
  instance: string;
}

// Type for window global
declare global {
  interface Window {
    __DOMO_DEV_DATA__?: DomoDevData;
  }
}

export function App() {
  const [devData, setDevData] = useState<DomoDevData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasThumbnail, setHasThumbnail] = useState(false);

  useEffect(() => {
    // Get data from window global injected by Vite plugin
    const data = window.__DOMO_DEV_DATA__;
    if (data) {
      setDevData(data);
      setIsFullscreen(data.manifest?.fullpage || false);

      // Check if thumbnail exists
      fetch('/thumbnail.png', {method: 'HEAD'})
        .then(res => setHasThumbnail(res.ok))
        .catch(() => setHasThumbnail(false));
    }
  }, []);

  if (!devData) {
    return (
      <div className="loading">
        <div className="loading-spinner">Loading Domo Dev Server...</div>
      </div>
    );
  }

  const {manifest, width, height, userId, customerId, instance} = devData;

  // Build the iframe URL with query parameters
  const url = `index.html?userId=${userId}&customer=${customerId}&locale=en-US&platform=desktop`;

  const displayWidth = isFullscreen ? '100%' : `${width}px`;
  const displayHeight = isFullscreen ? '100%' : `${height}px`;
  const displaySize = isFullscreen
    ? 'FULL-WIDTH x FULL-HEIGHT'
    : `${width}px x ${height}px`;

  return (
    <div className="dev-container">
      {!hasThumbnail && (
        <Warning>
          <strong>Warning:</strong> A thumbnail is required before creating a
          card with this design. Place a 300x300 image named{' '}
          <code>thumbnail.png</code> in the base directory of your design.
        </Warning>
      )}

      <Controls
        isFullscreen={isFullscreen}
        onToggleFullscreen={setIsFullscreen}
        isFullpageEnabled={manifest.fullpage !== false}
      />

      <AppPreview
        url={url}
        width={displayWidth}
        height={displayHeight}
        isFullscreen={isFullscreen}
        manifest={manifest}
        thumbnail={hasThumbnail ? '/thumbnail.png' : null}
        size={displaySize}
      />

      <footer className="dev-footer">
        <div className="instance-info">Instance: {instance}</div>
      </footer>
    </div>
  );
}
