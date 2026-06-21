import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type Tone = 'default' | 'inset';

const base =
  'w-full px-3 py-2.5 font-sans text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300';

// default sits on the page background; inset sits inside a white/gray-800 panel
const tones: Record<Tone, string> = {
  default: 'bg-white dark:bg-gray-800',
  inset: 'bg-gray-50 dark:bg-gray-900',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tone?: Tone;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ tone = 'default', className, ...rest }, ref) {
    return <input ref={ref} className={twMerge(base, tones[tone], className)} {...rest} />;
  }
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: Tone;
}

export function Textarea({ tone = 'default', className, ...rest }: TextareaProps) {
  return <textarea className={twMerge(base, tones[tone], 'resize-none', className)} {...rest} />;
}
