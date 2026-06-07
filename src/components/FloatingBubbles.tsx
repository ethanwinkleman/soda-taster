import { motion } from 'framer-motion';

interface Props {
  /** Visual size of the wrapped icon, used to scale the bubble field */
  size?: number;
  className?: string;
}

const bubbles = [
  { dx: -16, scale: 0.7, delay: 0 },
  { dx: 6, scale: 1, delay: 0.6 },
  { dx: 16, scale: 0.6, delay: 1.2 },
  { dx: -4, scale: 0.85, delay: 1.8 },
];

/** Gentle rising-bubble ambient animation, meant to sit behind a CupSoda icon in empty states. */
export function FloatingBubbles({ size = 32, className = '' }: Props) {
  const radius = size * 0.9;
  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none ${className}`}
      style={{ width: radius, height: radius }}
    >
      {bubbles.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-gray-300/70 dark:bg-gray-600/70"
          style={{
            width: 4 * b.scale,
            height: 4 * b.scale,
            left: '50%',
            marginLeft: b.dx,
            bottom: '38%',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -radius * 0.7, opacity: [0, 0.8, 0] }}
          transition={{ repeat: Infinity, duration: 3, delay: b.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
