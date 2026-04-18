import { CupSoda } from 'lucide-react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 16, pad: 'p-1.5', radius: 'rounded-lg',  text: 'text-base' },
  md: { icon: 20, pad: 'p-2',   radius: 'rounded-xl',  text: 'text-lg'   },
  lg: { icon: 32, pad: 'p-3',   radius: 'rounded-2xl', text: 'text-3xl'  },
};

export function Logo({ size = 'md' }: Props) {
  const { icon, pad, radius, text } = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div className={`bg-gradient-to-br from-sky-400 to-indigo-500 ${pad} ${radius} shadow-md shrink-0`}>
        <CupSoda size={icon} className="text-white" />
      </div>
      <span className={`${text} leading-none flex items-baseline gap-1.5`}>
        <span className="font-black tracking-tight text-sky-500">Soda</span>
        <span className="font-cursive text-gray-900 dark:text-white">Taster</span>
      </span>
    </div>
  );
}
