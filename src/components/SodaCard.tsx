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
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center gap-4"
      onClick={() => navigate(`/stash/${stashId}/soda/${soda.id}`)}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center shrink-0">
        <CupSoda size={20} className="text-sky-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{soda.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {soda.brand && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
          )}
          {soda.inFridge && (
            <span className="flex items-center gap-1 text-xs text-sky-500 dark:text-sky-400 shrink-0">
              <Refrigerator size={11} />
              {soda.quantity > 0 ? soda.quantity : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {soda.ratings.length} rating{soda.ratings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {soda.avgScore !== null ? (
        <ScoreBadge score={soda.avgScore} size="sm" />
      ) : (
        <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0">—</span>
      )}
    </div>
  );
}
