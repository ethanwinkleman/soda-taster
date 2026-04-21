interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getSealColor(score: number) {
  if (score >= 4.25) return 'bg-emerald-800 text-emerald-50 border-emerald-900';
  if (score >= 3.5)  return 'bg-lime-700    text-lime-50    border-lime-800';
  if (score >= 2.75) return 'bg-amber-700   text-amber-50   border-amber-800';
  if (score >= 2)    return 'bg-orange-800  text-orange-50  border-orange-900';
  return                    'bg-red-900     text-red-50     border-red-950';
}

export function ScoreBadge({ score, size = 'md' }: Props) {
  const sizeClass =
    size === 'sm' ? 'w-10 h-10 text-xs border-2' :
    size === 'lg' ? 'w-20 h-20 text-2xl border-4' :
                   'w-14 h-14 text-lg border-[3px]';

  return (
    <div
      className={`${sizeClass} ${getSealColor(score)} rounded-full flex items-center justify-center font-display font-black shrink-0 shadow-md`}
      title={`Overall score: ${score.toFixed(1)}`}
    >
      {score.toFixed(1)}
    </div>
  );
}
