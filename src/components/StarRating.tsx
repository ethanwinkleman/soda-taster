import { useState } from 'react';

interface Props {
  value: number;        // 0, 0.5, 1.0 … 5.0
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

function StarIcon({ fill, className }: { fill: 'full' | 'half' | 'empty'; className: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="text-gray-200 dark:text-gray-700">★</span>
      {fill !== 'empty' && (
        <span
          className="absolute inset-0 text-amber-400"
          style={fill === 'half' ? { clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' } : undefined}
        >
          ★
        </span>
      )}
    </span>
  );
}

export function StarRating({ value, onChange, size = 'md', readOnly = false }: Props) {
  const [hover, setHover] = useState(0);
  const display = readOnly ? value : (hover || value);
  const sizeClass = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl';

  function getFill(star: number): 'full' | 'half' | 'empty' {
    if (display >= star) return 'full';
    if (display >= star - 0.5) return 'half';
    return 'empty';
  }

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => !readOnly && setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <div key={star} className={`relative ${readOnly ? '' : 'cursor-pointer'}`}>
          <StarIcon fill={getFill(star)} className={sizeClass} />
          {!readOnly && (
            <div className="absolute inset-0 flex">
              <div
                className="w-1/2 h-full"
                onMouseEnter={() => setHover(star - 0.5)}
                onClick={() => onChange?.(star - 0.5)}
              />
              <div
                className="w-1/2 h-full"
                onMouseEnter={() => setHover(star)}
                onClick={() => onChange?.(star)}
              />
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium tabular-nums w-8">
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}
