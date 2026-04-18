import { Heart, Calendar, Beaker, CupSoda } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SodaEntry } from '../types/soda';
import { ScoreBadge } from './ScoreBadge';
import { getTagLabel, SIZE_LABELS, SUGAR_LABELS } from '../utils/labels';

interface Props {
  soda: SodaEntry;
  onToggleFavorite: (id: string) => void;
  readOnly?: boolean;
}

export function SodaCard({ soda, onToggleFavorite, readOnly = false }: Props) {
  const navigate = useNavigate();

  const image = soda.photo ? (
    <img src={soda.photo} alt={soda.name} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center">
      <CupSoda size={36} className="text-sky-300/60" />
    </div>
  );

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-row sm:flex-col"
      onClick={() => navigate(`/soda/${soda.id}`)}
    >
      {/* Content — left on mobile, bottom on desktop */}
      <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-base">
                {soda.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(soda.id); }}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label={soda.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={18} className={soda.isFavorite ? 'fill-red-500 text-red-500' : ''} />
                </button>
              )}
              <ScoreBadge score={soda.overallScore} size="sm" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {soda.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs rounded-full font-medium">
                {getTagLabel(tag)}
              </span>
            ))}
            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full flex items-center gap-1">
              <Beaker size={10} />
              {SIZE_LABELS[soda.size]}
            </span>
            <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
              {SUGAR_LABELS[soda.sugarType]}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Calendar size={11} />
          {new Date(soda.dateRated).toLocaleDateString()}
        </div>
      </div>

      {/* Image — right on mobile (fixed width, full height), top on desktop */}
      <div className="w-28 shrink-0 sm:w-full sm:aspect-[3/4] sm:order-first overflow-hidden">
        {image}
      </div>
    </div>
  );
}
