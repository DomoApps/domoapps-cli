import React from 'react';

interface ControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: (value: boolean) => void;
  isFullpageEnabled: boolean;
}

export function Controls({
  isFullscreen,
  onToggleFullscreen,
  isFullpageEnabled,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="fullscreen-toggle">
        <input
          type="checkbox"
          id="fullscreenToggle"
          checked={isFullscreen}
          onChange={e => onToggleFullscreen(e.target.checked)}
          disabled={!isFullpageEnabled}
        />
        <label htmlFor="fullscreenToggle">
          <span className="toggle-slider" />
        </label>
        <span className="toggle-label">Fullscreen</span>
      </div>
    </div>
  );
}
