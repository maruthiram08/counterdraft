import React from 'react';

// Marks a feature the marketing pages mention that the app doesn't offer yet
export const ComingSoon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium whitespace-nowrap ${className}`}>
    Coming soon
  </span>
);
