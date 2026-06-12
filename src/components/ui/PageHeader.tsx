import { ChevronLeft } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface Props {
  title?: React.ReactNode;
  onBack?: () => void;
  /** 'mobile' hides the back chevron on md+ (used where the sidebar covers navigation) */
  backVisibility?: 'always' | 'mobile';
  size?: 'md' | 'lg';
  className?: string;
  /** Custom content between the rules; replaces the default h1 when provided */
  children?: React.ReactNode;
}

export function PageHeader({ title, onBack, backVisibility = 'always', size = 'lg', className, children }: Props) {
  return (
    <div className={twMerge('flex items-start gap-2 mb-8', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={twMerge(
            'p-3 -m-1.5 mt-[-3px] shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            backVisibility === 'mobile' && 'md:hidden',
          )}
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="border-t border-gray-800 dark:border-gray-200 mb-1" />
        {children ?? (
          <h1 className={twMerge(
            'font-display font-black italic text-gray-900 dark:text-white',
            size === 'lg' ? 'text-2xl' : 'text-xl',
          )}>
            {title}
          </h1>
        )}
        <div className="border-b border-gray-400 dark:border-gray-600 mt-1" />
      </div>
    </div>
  );
}
