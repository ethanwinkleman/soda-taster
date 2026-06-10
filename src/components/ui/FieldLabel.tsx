import { twMerge } from 'tailwind-merge';

interface Props extends React.LabelHTMLAttributes<HTMLLabelElement> {
  as?: 'label' | 'p';
}

// The newsprint micro-label. No default margin — callers set their own
// spacing so the base style never fights a passed-in mb-*.
const base = 'block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400';

export function FieldLabel({ as: Tag = 'label', className, ...rest }: Props) {
  // 'p' usage never passes label-only attributes, so the cast is safe
  return <Tag className={twMerge(base, className)} {...(rest as React.HTMLAttributes<HTMLElement>)} />;
}
