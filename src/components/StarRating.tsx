interface Props {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export function StarRating({ value, onChange, max = 5, size = 'md', readOnly = false }: Props) {
  const sizeClass = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`${sizeClass} transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} focus:outline-none`}
          aria-label={`${star} out of ${max}`}
        >
          <span className={star <= value ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}>
            ★
          </span>
        </button>
      ))}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium tabular-nums">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
