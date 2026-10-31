import { ChevronLeft } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface Props {
  onClick: () => void;
  className?: string;
  label?: string;
}

/**
 * The back control, in one place because it was in five with four different sizes.
 *
 * It is 44px of *visible* target rather than a 32px chevron with an invisible 44 around
 * it: a hit area you cannot see does not help you aim, and this one sits in the corner
 * a thumb reaches for least accurately. `-ml-2` keeps the chevron optically where the
 * smaller button put it, so growing the target does not shift every page title right.
 */
export function BackButton({ onClick, className, label = 'Back' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={twMerge(
        // 44px visible, 56px hittable. The extra reaches into the page margin and the
        // title beside it — neither of which is interactive — so it is free, and this
        // is the corner a thumb stretches to and misses.
        'relative before:absolute before:left-1/2 before:top-1/2 before:h-14 before:w-14',
        'before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""]',
        '-ml-2 h-11 w-11 shrink-0 rounded-xl flex items-center justify-center',
        // A resting surface, not just a chevron. A target you cannot see the edges of
        // does not read as a target — the same reason the add button stopped being a
        // full-width bar. Borrows the standard surface: white, hairline border, soft
        // shadow.
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]',
        'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
        'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        className,
      )}
    >
      <ChevronLeft size={24} />
    </button>
  );
}
