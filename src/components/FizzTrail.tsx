import { motion, useReducedMotion } from 'framer-motion';

/**
 * A few bubbles rising behind a page as you go deeper into the app.
 *
 * Deliberately one-directional and one-shot: it plays on a push into content and never
 * on the way back, because a flourish you see on every single navigation stops reading
 * as delight and starts reading as lag. It unmounts with the page that spawned it.
 *
 * Positions are fixed rather than random — a layout that reshuffles every time looks
 * like a glitch rather than a signature.
 */
const BUBBLES = [
  { left: '12%', size: 8,  delay: 0.00, tint: 'bg-sky-400/35' },
  { left: '31%', size: 5,  delay: 0.08, tint: 'bg-cyan-400/35' },
  { left: '54%', size: 10, delay: 0.04, tint: 'bg-amber-400/30' },
  { left: '72%', size: 6,  delay: 0.12, tint: 'bg-sky-300/35' },
  { left: '88%', size: 7,  delay: 0.02, tint: 'bg-cyan-500/25' },
];

export function FizzTrail() {
  // Rising is the whole animation; with motion reduced there is nothing left worth
  // rendering, and five static dots would just be litter.
  if (useReducedMotion()) return null;

  return (
    // Fixed to the viewport, not to the page. Anchored inside the page container it
    // would sit at the bottom of the *document*, which on any collection longer than a
    // screen means the fizz rises somewhere nobody is looking. It is rendered outside
    // the transformed element for the same reason: a transformed ancestor makes `fixed`
    // behave like `absolute`.
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-64 overflow-hidden">
      {BUBBLES.map((b) => (
        <motion.span
          key={b.left}
          className={`absolute bottom-0 rounded-full ${b.tint}`}
          style={{ left: b.left, width: b.size, height: b.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -170, opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.85, delay: b.delay, ease: [0.25, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
