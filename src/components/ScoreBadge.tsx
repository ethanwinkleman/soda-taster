interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number) {
  if (score >= 8.5) return 'bg-emerald-500 text-white';
  if (score >= 7) return 'bg-green-400 text-white';
  if (score >= 5.5) return 'bg-yellow-400 text-gray-900';
  if (score >= 4) return 'bg-orange-400 text-white';
  return 'bg-red-500 text-white';
}

export function ScoreBadge({ score, size = 'md' }: Props) {
  const sizeClass =
    size === 'sm'
      ? 'w-10 h-10 text-sm'
      : size === 'lg'
      ? 'w-20 h-20 text-3xl'
      : 'w-14 h-14 text-xl';

  return (
    <div
      className={`${sizeClass} ${getColor(score)} rounded-full flex items-center justify-center font-bold shadow-md shrink-0`}
      title={`Overall score: ${score.toFixed(1)}`}
    >
      {score.toFixed(1)}
    </div>
  );
}
