import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/** Drop the DOM drag/animation handlers framer-motion also declares, so they don't clash. */
type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
>;

interface Props extends NativeButtonProps {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-sans uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'font-bold text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300 shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]',
  secondary:
    'font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
  danger:
    'font-medium normal-case text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:text-red-600 hover:border-red-300',
};

// `sm` was text-xs — 12px of uppercase, tracked out, which reads as a label rather than
// something you press. 13px is still compact and no longer whispering.
const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2.5 text-[13px]',
  md: 'px-5 py-3 text-sm',
  // For the one action a screen is really offering. Deliberately not full width: a bar
  // spanning the viewport reads as a banner, and the thing that makes a button look
  // pressable is having an edge on both sides.
  lg: 'px-7 py-3.5 text-[15px]',
};

export function Button({ variant = 'primary', size = 'sm', className, type = 'button', disabled, ...rest }: Props) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      // The most-tapped element in the app used to be inert on press while the soda
      // cards gave way under a finger. Matches SodaCard's 0.97 so the whole app
      // responds with the same weight.
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={twMerge(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
}
