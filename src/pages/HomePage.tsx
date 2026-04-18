import { useState, useMemo } from 'react';
import { Search, SortAsc, CupSoda } from 'lucide-react';
import type { SodaEntry, SortOption } from '../types/soda';
import { SodaCard } from '../components/SodaCard';
import { getTagLabel } from '../utils/labels';
import { useNavigate } from 'react-router-dom';

interface Props {
  sodas: SodaEntry[];
  onToggleFavorite: (id: string) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
];

export function HomePage({ sodas, onToggleFavorite }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const usedTags = useMemo(
    () => Array.from(new Set(sodas.flatMap((s) => s.tags))),
    [sodas]
  );

  const filtered = useMemo(() => {
    let result = sodas;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q)
      );
    }
    if (activeTag) {
      result = result.filter((s) => s.tags.includes(activeTag));
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'highest': return b.overallScore - a.overallScore;
        case 'lowest': return a.overallScore - b.overallScore;
        case 'oldest': return new Date(a.dateRated).getTime() - new Date(b.dateRated).getTime();
        default: return new Date(b.dateRated).getTime() - new Date(a.dateRated).getTime();
      }
    });
  }, [sodas, query, sort, activeTag]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search + sort bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or brand..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div className="relative">
          <SortAsc size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="pl-8 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tag filter */}
      {usedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeTag === null
                ? 'bg-sky-500 text-white border-sky-500'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-sky-400'
            }`}
          >
            All
          </button>
          {usedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeTag === tag
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-sky-400'
              }`}
            >
              {getTagLabel(tag)}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sodas.length === 0 ? (
        <div className="text-center py-20">
          <CupSoda size={64} className="text-sky-300/50 mb-4 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No sodas rated yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Start by rating your first soda!</p>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Rate a Soda
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No sodas match your search.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {filtered.length} soda{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((soda) => (
              <SodaCard key={soda.id} soda={soda} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
