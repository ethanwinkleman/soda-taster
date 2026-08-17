import React from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  // motion-reduce disables the pulse: it is decorative, unlike the spinners elsewhere
  // which are the only signal that something is in progress.
  return <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse motion-reduce:animate-none ${className}`} style={style} />;
}
