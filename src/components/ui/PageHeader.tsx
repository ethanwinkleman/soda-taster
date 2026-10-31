import { twMerge } from 'tailwind-merge';
import { BackButton } from './BackButton';

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
        <BackButton
          onClick={onBack}
          className={twMerge('-mt-1', backVisibility === 'mobile' && 'md:hidden')}
        />
      )}
      <div className="flex-1 min-w-0">
        {children ?? (
          <h1 className={twMerge(
            'font-display font-bold text-gray-900 dark:text-white',
            size === 'lg' ? 'text-2xl' : 'text-xl',
          )}>
            {title}
          </h1>
        )}
      </div>
    </div>
  );
}
