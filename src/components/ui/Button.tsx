import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 font-sans uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'font-bold text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300',
  secondary:
    'font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
  danger:
    'font-medium normal-case text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:text-red-600 hover:border-red-300',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
};

export function Button({ variant = 'primary', size = 'sm', className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={twMerge(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
}
