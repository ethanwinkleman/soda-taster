import React from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`} style={style} />;
}
