import { StarRating } from './StarRating';

interface Props {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}

export function CategoryRatingRow({ label, value, onChange, readOnly = false }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">
        {label}
      </span>
      <div className="flex-1">
        <StarRating value={value} onChange={onChange} readOnly={readOnly} size="sm" />
      </div>
      {readOnly && (
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-8 text-right tabular-nums">
          {value}/5
        </span>
      )}
    </div>
  );
}
