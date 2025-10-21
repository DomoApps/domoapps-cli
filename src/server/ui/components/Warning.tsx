import React, {ReactNode} from 'react';

interface WarningProps {
  children: ReactNode;
}

export function Warning({children}: WarningProps) {
  return (
    <section className="messages">
      <div className="warning-message">{children}</div>
    </section>
  );
}
