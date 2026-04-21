interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
};

export function Logo({ size = 'md' }: Props) {
  return (
    <span
      className={`font-cursive ${sizeClass[size]} text-gray-900 dark:text-gray-100 leading-none tracking-wide select-none`}
    >
      Soda Taster
    </span>
  );
}
