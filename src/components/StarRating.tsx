import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  value: number;        // 0, 0.5, 1.0 … 5.0
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

interface Bubble {
  id: number;
  x: number; // percent across the row
  color: string;
  size: number;
  delay: number;
}

let bubbleId = 0;

function StarIcon({ fill, className }: { fill: 'full' | 'half' | 'empty'; className: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="text-gray-200 dark:text-gray-700">★</span>
      {fill !== 'empty' && (
        <span
          className="absolute inset-0 bg-gradient-to-br from-sky-500 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,61,120,0.35)]"
          style={fill === 'half' ? { clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' } : undefined}
        >
          ★
        </span>
      )}
    </span>
  );
}

export function StarRating({ value, onChange, size = 'md', readOnly = false }: Props) {
  const [preview, setPreview] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const interactive = !readOnly && !!onChange;
  const display = interactive ? (preview || value) : value;
  const sizeClass = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-6xl' : 'text-2xl';
  const gapClass = size === 'lg' ? 'gap-2' : 'gap-1';
  const readoutClass = size === 'lg' ? 'ml-3 text-xl w-10' : 'ml-2 text-sm w-8';

  function getFill(star: number): 'full' | 'half' | 'empty' {
    if (display >= star) return 'full';
    if (display >= star - 0.5) return 'half';
    return 'empty';
  }

  // Map a pointer x-position to a 0.5–5.0 rating across the whole row, so the
  // touch target is the entire star strip rather than ten ~18px half-zones.
  function ratingFromX(clientX: number) {
    const rect = rowRef.current!.getBoundingClientRect();
    const frac = (clientX - rect.left) / rect.width;
    return Math.min(5, Math.max(0.5, Math.ceil(frac * 10) / 2));
  }

  // A little carbonation burst at the tap point whenever a rating is committed.
  function spawnFizz(clientX: number) {
    const rect = rowRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const colors = ['var(--color-cyan-500)', 'var(--color-amber-500)'];
    const fresh: Bubble[] = Array.from({ length: 5 }, (_, i) => ({
      id: bubbleId++,
      x: Math.min(96, Math.max(4, x + (Math.random() - 0.5) * 16)),
      color: colors[i % 2],
      size: 4 + Math.random() * 4,
      delay: i * 0.04,
    }));
    setBubbles((b) => [...b, ...fresh]);
    setTimeout(() => {
      setBubbles((b) => b.filter((bub) => !fresh.includes(bub)));
    }, 700);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setPreview(ratingFromX(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    if (dragging || e.pointerType === 'mouse') setPreview(ratingFromX(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !dragging) return;
    setDragging(false);
    setPreview(0);
    spawnFizz(e.clientX);
    onChange?.(ratingFromX(e.clientX));
  }

  return (
    <div className="flex items-center">
      <div
        ref={rowRef}
        role={interactive ? 'slider' : undefined}
        aria-label={interactive ? 'Rating' : undefined}
        aria-valuemin={interactive ? 0.5 : undefined}
        aria-valuemax={interactive ? 5 : undefined}
        aria-valuenow={interactive ? (value || undefined) : undefined}
        className={`relative flex items-center ${gapClass} ${interactive ? 'touch-none cursor-pointer py-2 -my-2 pr-2 -mr-2' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { setDragging(false); setPreview(0); }}
        onPointerLeave={() => { if (!dragging) setPreview(0); }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} fill={getFill(star)} className={sizeClass} />
        ))}
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.span
              key={b.id}
              className="absolute bottom-1/2 rounded-full pointer-events-none"
              style={{ left: `${b.x}%`, width: b.size, height: b.size, background: b.color }}
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{ y: -36, opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.6, delay: b.delay, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
      {interactive && (
        <span className={`${readoutClass} text-gray-500 dark:text-gray-400 font-medium tabular-nums`}>
          {display > 0 ? display.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}
