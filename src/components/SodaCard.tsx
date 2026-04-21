import { useNavigate } from 'react-router-dom';
import { Refrigerator, CupSoda } from 'lucide-react';
import type { Soda } from '../types/stash';
import { ScoreBadge } from './ScoreBadge';

interface Props {
  soda: Soda;
  stashId: string;
}

export function SodaCard({ soda, stashId }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 p-3"
      onClick={() => navigate(`/stash/${stashId}/soda/${soda.id}`)}
    >
      {/* Thumbnail */}
      {soda.imageUrl ? (
        <img
          src={soda.imageUrl}
          alt=""
          className="w-12 h-12 object-cover shrink-0 border border-gray-200 dark:border-gray-600"
        />
      ) : (
        <div className="w-12 h-12 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-700">
          <CupSoda size={20} className="text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
          {soda.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {soda.brand && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-sans italic">
              {soda.brand}
            </p>
          )}
          {soda.inFridge && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 shrink-0 font-sans uppercase tracking-wide">
              <Refrigerator size={10} />
              {soda.quantity > 0 ? `×${soda.quantity}` : 'stocked'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-sans uppercase tracking-wide">
          {soda.ratings.length} rating{soda.ratings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Score seal */}
      {soda.avgScore !== null ? (
        <ScoreBadge score={soda.avgScore} size="sm" />
      ) : (
        <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0 font-sans">—</span>
      )}
    </div>
  );
}
